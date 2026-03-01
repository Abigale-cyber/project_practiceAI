"""
智能问答路由 —— 接入 RAG 检索增强生成

流程（参考 swxy/backend/app/service/core/chat.py）：
1. 保存用户消息
2. 从知识库检索相关内容
3. 将检索内容注入到 LLM prompt
4. 流式返回 LLM 响应 + 引用 + 推荐问题
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from utils.database import get_db, SessionLocal
from utils import logger
from models.chat import ChatSession, ChatMessage
from schemas.chat import ChatRequest, ChatSessionResponse, ChatMessageResponse, ChatSessionListItem
from service.llm import chat_stream, generate_session_title
from service.rag import retrieve_relevant_chunks, build_rag_prompt, format_citations
from service.document_parser import parse_document
from service.auth import get_current_user
from typing import List
import uuid
import json
import asyncio
import tempfile
import os

router = APIRouter(prefix="/api/chat", tags=["智能问答"])


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """创建问答会话"""
    try:
        session_id = str(uuid.uuid4()).replace("-", "")[:16]
        user_id = current_user["user_id"]

        session = ChatSession(
            id=session_id,
            user_id=user_id,
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
    current_user: dict = Depends(get_current_user),
):
    """获取会话列表"""
    try:
        user_id = current_user["user_id"]
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == user_id
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


@router.post("/parse-file")
async def parse_temp_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """解析临时文件，提取文本内容（不存储）"""
    try:
        file_ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
        supported = ('txt', 'md', 'markdown', 'docx', 'pdf')
        if file_ext not in supported:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式: .{file_ext}")

        # 写入临时文件以便解析
        content = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            text = parse_document(tmp_path, file_ext)
        finally:
            os.unlink(tmp_path)  # 清理临时文件

        # 截取前 8000 字符避免超过 LLM 上下文窗口
        if len(text) > 8000:
            text = text[:8000] + "\n...（内容已截取）"

        return {
            "filename": file.filename,
            "text": text,
            "char_count": len(text),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"解析临时文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: ChatRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """发送消息（SSE 流式响应，接入 RAG + 大模型）"""
    try:
        user_id = current_user["user_id"]

        # 保存用户消息
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message,
            attached_docs=request.attached_docs,
        )
        db.add(user_msg)
        db.commit()

        # 后台用 LLM 自动生成会话标题
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session and (not session.title or session.title == "新会话"):
            # 先设临时标题，后台替换为 AI 生成的
            session.title = request.message[:20]
            db.commit()
            # 后台任务生成更好的标题
            def _update_title(sid: str, msg: str):
                try:
                    title = generate_session_title(msg)
                    if title:
                        tdb = SessionLocal()
                        try:
                            s = tdb.query(ChatSession).filter(ChatSession.id == sid).first()
                            if s:
                                s.title = title
                                tdb.commit()
                        finally:
                            tdb.close()
                except Exception as e:
                    logger.error(f"生成标题失败: {e}")
            import threading
            threading.Thread(target=_update_title, args=(session_id, request.message), daemon=True).start()

        # ========== RAG 检索 ==========
        # 先判断是否为闲聊/打招呼，如果是则跳过知识库检索
        import re as _re
        _casual_patterns = [
            r'^(你好|您好|嗨|hi|hello|hey|哈喽|嘿|在吗|在不在)',
            r'^(谢谢|感谢|辛苦了|好的|收到|明白|懂了|OK|ok)',
            r'^(讲个笑话|说个段子|今天天气|几点了|你是谁|你叫什么)',
            r'^(早上好|下午好|晚上好|晚安|早安|拜拜|再见|bye)',
        ]
        _msg_stripped = request.message.strip().lower()
        _is_casual = len(_msg_stripped) <= 6 and any(
            _re.search(p, _msg_stripped, _re.IGNORECASE) for p in _casual_patterns
        )

        if _is_casual and not request.document_ids:
            # 闲聊不检索知识库
            retrieved_content = []
            logger.info("检测到闲聊，跳过 RAG 检索")
        else:
            # 从知识库检索相关内容
            retrieved_content = retrieve_relevant_chunks(
                question=request.message,
                db=db,
                top_k=5,
                similarity_threshold=0.3,
                document_ids=request.document_ids,
            )
        logger.info(f"RAG 检索到 {len(retrieved_content)} 条相关内容")

        # 构建带知识库上下文的 prompt
        rag_system_prompt = build_rag_prompt(request.message, retrieved_content)

        # 如果有临时文件上下文（短期记忆），追加到 prompt 并生成临时文件引用
        file_citations = []
        if request.file_context:
            rag_system_prompt += f"\n\n用户上传的参考文件内容（请优先基于此内容回答）：\n{request.file_context}"
            # 从 file_context 中提取文件名（格式为 【文件名】）
            import re as _re
            file_names = _re.findall(r'【(.+?)】', request.file_context)
            for i, fname in enumerate(file_names):
                # 提取该文件对应的内容片段
                parts = request.file_context.split(f'【{fname}】')
                content_part = parts[1].split('【')[0].strip() if len(parts) > 1 else ""
                file_citations.append({
                    "id": 1000 + i,
                    "document_name": f"📎 {fname}（临时上传）",
                    "content": content_part[:200] + "..." if len(content_part) > 200 else content_part,
                })

        # 获取历史消息作为上下文（最近 10 条）
        history_msgs = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()

        messages = []
        for m in history_msgs[-10:]:
            messages.append({"role": m.role, "content": m.content})

        # 格式化引用信息
        # 如果有临时文件，优先显示临时文件引用；否则显示知识库引用
        if file_citations:
            citations = file_citations
        else:
            citations = format_citations(retrieved_content) if retrieved_content else []

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
    current_user: dict = Depends(get_current_user),
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
                "attached_docs": m.attached_docs,
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in messages
        ]
    except Exception as e:
        logger.error(f"获取消息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sessions/{session_id}/title")
async def rename_session(
    session_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """重命名会话标题"""
    try:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        session.title = data.get("title", "新会话")[:50]
        db.commit()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """删除会话及其所有消息"""
    try:
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.query(ChatSession).filter(ChatSession.id == session_id).delete()
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
