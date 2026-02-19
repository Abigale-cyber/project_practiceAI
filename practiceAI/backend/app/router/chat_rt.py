"""
智能问答路由 —— 接入 RAG 检索增强生成

流程（参考 swxy/backend/app/service/core/chat.py）：
1. 保存用户消息
2. 从知识库检索相关内容
3. 将检索内容注入到 LLM prompt
4. 流式返回 LLM 响应 + 引用 + 推荐问题
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from utils.database import get_db, SessionLocal
from utils import logger
from models.chat import ChatSession, ChatMessage
from schemas.chat import ChatRequest, ChatSessionResponse, ChatMessageResponse, ChatSessionListItem
from service.llm import chat_stream
from service.rag import retrieve_relevant_chunks, build_rag_prompt, format_citations
from typing import List
import uuid
import json
import asyncio

router = APIRouter(prefix="/api/chat", tags=["智能问答"])

# 临时硬编码 user_id，跳过 JWT 认证（测试用）
TEST_USER_ID = 1


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    db: Session = Depends(get_db),
):
    """创建问答会话"""
    try:
        session_id = str(uuid.uuid4()).replace("-", "")[:16]

        session = ChatSession(
            id=session_id,
            user_id=TEST_USER_ID,
            title="新会话",
        )
        db.add(session)
        db.commit()

        return ChatSessionResponse(
            session_id=session_id,
            status="success",
            message="会话创建成功",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"创建会话失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions", response_model=List[ChatSessionListItem])
async def list_sessions(
    db: Session = Depends(get_db),
):
    """获取会话列表"""
    try:
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == TEST_USER_ID
        ).order_by(ChatSession.updated_at.desc()).all()

        return [
            ChatSessionListItem(
                id=s.id,
                title=s.title or "新会话",
                created_at=s.created_at.isoformat() if s.created_at else "",
                updated_at=s.updated_at.isoformat() if s.updated_at else "",
            )
            for s in sessions
        ]
    except Exception as e:
        logger.error(f"获取会话列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: ChatRequest = Body(...),
    db: Session = Depends(get_db),
):
    """发送消息（SSE 流式响应，接入 RAG + 大模型）"""
    try:
        # 保存用户消息
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message,
        )
        db.add(user_msg)
        db.commit()

        # ========== RAG 检索 ==========
        # 从知识库检索相关内容（参考 swxy 的 retrieve_content）
        retrieved_content = retrieve_relevant_chunks(
            question=request.message,
            db=db,
            top_k=5,
            similarity_threshold=0.3,
            document_ids=request.document_ids,
        )
        logger.info(f"RAG 检索到 {len(retrieved_content)} 条相关内容")

        # 构建带知识库上下文的 prompt（参考 swxy 的 get_chat_completion）
        rag_system_prompt = build_rag_prompt(request.message, retrieved_content)

        # 获取历史消息作为上下文（最近 10 条）
        history_msgs = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()

        messages = []
        for m in history_msgs[-10:]:
            messages.append({"role": m.role, "content": m.content})

        # 格式化引用信息
        citations = format_citations(retrieved_content)

        async def generate_response():
            full_response = ""
            suggested = ["这个概念还有哪些应用场景？", "能再详细解释一下吗？", "有没有相关的练习题？"]

            # 调用大模型流式生成（使用 RAG prompt 作为系统提示）
            for chunk in chat_stream(messages, system_prompt=rag_system_prompt):
                if chunk["type"] == "content":
                    full_response += chunk["content"]
                    data = json.dumps({"type": "content", "content": chunk["content"]}, ensure_ascii=False)
                    yield f"data: {data}\n\n"

                elif chunk["type"] == "thinking":
                    data = json.dumps({"type": "thinking", "content": chunk["content"]}, ensure_ascii=False)
                    yield f"data: {data}\n\n"

                elif chunk["type"] == "error":
                    data = json.dumps({"type": "error", "content": chunk["content"]}, ensure_ascii=False)
                    yield f"data: {data}\n\n"
                    full_response = f"[错误] {chunk['content']}"
                    break

                elif chunk["type"] == "done":
                    full_response = chunk.get("full_response", full_response)

            # 发送引用（RAG 检索到的文档来源）
            data = json.dumps({"type": "citations", "citations": citations}, ensure_ascii=False)
            yield f"data: {data}\n\n"

            # 发送推荐问题
            data = json.dumps({"type": "suggested_questions", "questions": suggested}, ensure_ascii=False)
            yield f"data: {data}\n\n"

            # 用独立的 db session 保存助手消息
            save_db = SessionLocal()
            try:
                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=full_response,
                    citations=citations,
                    suggested_questions=suggested,
                )
                save_db.add(assistant_msg)
                save_db.commit()
            except Exception as save_err:
                save_db.rollback()
                logger.error(f"保存助手消息失败: {str(save_err)}")
            finally:
                save_db.close()

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.error(f"发送消息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    db: Session = Depends(get_db),
):
    """获取会话历史消息"""
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()

        return [
            {
                "id": str(m.id),
                "session_id": m.session_id,
                "role": m.role,
                "content": m.content,
                "citations": m.citations,
                "suggested_questions": m.suggested_questions,
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in messages
        ]
    except Exception as e:
        logger.error(f"获取消息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
