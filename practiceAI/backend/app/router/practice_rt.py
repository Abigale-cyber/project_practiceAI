"""
练习模块 —— 基于 RAG + LLM 智能出题
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from typing import List, Optional
from utils.database import get_db
from utils import logger
from models.practice import PracticeSession, PracticeAnswer
from models.knowledge import KnowledgeDocument, KnowledgeChunk
from models.settings import PracticeSettings
from models.static_question import StaticQuestion
from schemas.practice import (
    StartPracticeRequest,
    SubmitAnswerRequest,
    AnswerResult,
)
from service.rag import retrieve_relevant_chunks
from service.llm import chat_block
from service.auth import get_current_user
import json
import random
import re

router = APIRouter(prefix="/api/practice", tags=["练习"])

# ===== 出题 Prompt =====
from service.prompts import QUIZ_SYSTEM_PROMPT as QUESTION_GENERATION_PROMPT
from service.prompts import QUIZ_GRADING_PROMPT as ESSAY_GRADING_PROMPT


@router.get("/knowledge-bases")
async def get_knowledge_bases(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取可练习的知识库列表"""
    try:
        docs = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.status == "processed"
        ).all()

        if not docs:
            return [{"id": "all", "name": "全部知识库（暂无文档）"}]

        result = [{"id": "all", "name": "全部知识库"}]
        for doc in docs:
            result.append({"id": str(doc.id), "name": doc.name})

        return result
    except Exception as e:
        logger.error(f"获取知识库列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/question-sets")
async def get_student_question_sets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取教师已配置好的题目集（必修闯关用）"""
    from models.question import QuestionSet, Question as QuestionModel
    try:
        sets = db.query(QuestionSet).filter(
            QuestionSet.status == "ready",
            QuestionSet.is_active == True,
        ).order_by(QuestionSet.created_at.desc()).all()

        result = []
        for s in sets:
            q_count = db.query(QuestionModel).filter(QuestionModel.set_id == s.id).count()
            result.append({
                "id": s.id,
                "topic_name": s.topic_name,
                "knowledge_base_name": s.knowledge_base_name,
                "question_count": q_count,
                "difficulty": s.difficulty,
            })
        return result
    except Exception as e:
        logger.error(f"获取学生题目集失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/from-set/{set_id}")
async def start_practice_from_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """从教师预生成的题目集开始练习（必修闯关）"""
    from models.question import QuestionSet, Question as QuestionModel
    try:
        user_id = current_user["user_id"]
        qs = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not qs:
            raise HTTPException(status_code=404, detail="题目集不存在")
        if qs.status != "ready":
            raise HTTPException(status_code=400, detail="题目集尚未就绪")

        stored_questions = db.query(QuestionModel).filter(
            QuestionModel.set_id == set_id
        ).order_by(QuestionModel.sort_order).all()

        if not stored_questions:
            raise HTTPException(status_code=400, detail="该题目集暂无题目")

        session = PracticeSession(
            user_id=user_id,
            knowledge_base=qs.knowledge_base_id or "all",
            question_type="all",
            total_questions=len(stored_questions),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        questions_data = []
        for i, sq in enumerate(stored_questions):
            q_id = i + 1
            questions_data.append({
                "id": q_id,
                "type": sq.question_type,
                "question": sq.content,
                "options": sq.options,
            })
            answer_placeholder = PracticeAnswer(
                session_id=session.id,
                question_id=q_id,
                user_answer="",
                is_correct=None,
                ai_feedback=json.dumps({
                    "correct_answer": sq.answer,
                    "explanation": sq.explanation or "",
                    "type": sq.question_type,
                    "question": sq.content,
                }, ensure_ascii=False),
            )
            db.add(answer_placeholder)

        db.commit()

        logger.info(f"必修闯关开始: session={session.id}, set={set_id}, user={user_id}")

        return {
            "session_id": session.id,
            "questions": questions_data,
            "total_questions": len(questions_data),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"必修闯关失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions")
async def start_practice(
    data: StartPracticeRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """开始练习 —— 从知识库检索内容，用 LLM 生成题目"""
    try:
        user_id = current_user["user_id"]

        # 获取配置，判断出题方式
        settings = db.query(PracticeSettings).first()
        question_source = settings.question_source if settings else "ai_generated"
        question_count = data.question_count or 5
        question_type = data.question_type or "all"

        if question_source == "static_bank":
            # 题库随机抽题
            logger.info(f"从手工题库随机抽题: count={question_count}, type={question_type}")
            query = db.query(StaticQuestion)
            if question_type != "all":
                query = query.filter(StaticQuestion.type == question_type)
            
            static_questions = query.order_by(func.random()).limit(question_count).all()
            if not static_questions:
                raise HTTPException(status_code=400, detail="题库中题目不足，请先在系统配置中添加手工题库，或切换为[AI 即时出题]")
            
            questions = []
            for sq in static_questions:
                questions.append({
                    "type": sq.type,
                    "question": sq.question,
                    "options": sq.options,
                    "correct_answer": sq.correct_answer,
                    "explanation": sq.explanation
                })
        else:
            # AI 智能生成题目
            knowledge_content = _get_knowledge_content(data.knowledge_base, db)

            if not knowledge_content:
                raise HTTPException(
                    status_code=400,
                    detail="知识库中暂无可用内容，请先上传文档"
                )

            # 2. 确定出题数量和类型
            type_instruction = ""
            if question_type == "choice":
                type_instruction = f"请生成 {question_count} 道选择题。"
            elif question_type == "essay":
                type_instruction = f"请生成 {question_count} 道问答题。"
            else:
                choice_count = max(1, question_count * 3 // 5)
                essay_count = question_count - choice_count
                type_instruction = f"请生成 {choice_count} 道选择题和 {essay_count} 道问答题，共 {question_count} 道题。"

            # 3. 调用 LLM 生成题目
            logger.info(f"开始智能出题: count={question_count}, type={question_type}, user={user_id}")

            user_message = f"""{type_instruction}

【知识库内容】:
{knowledge_content}

请根据以上知识库内容出题。"""

            llm_response = chat_block(
                messages=[{"role": "user", "content": user_message}],
                system_prompt=QUESTION_GENERATION_PROMPT,
            )

            # 4. 解析 LLM 返回的题目
            questions = _parse_questions(llm_response)

            if not questions:
                raise HTTPException(
                    status_code=500,
                    detail="AI 出题失败，请重试"
                )

        # 5. 创建练习会话
        session = PracticeSession(
            user_id=user_id,
            knowledge_base=data.knowledge_base or "all",
            question_type=question_type,
            total_questions=len(questions),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 6. 为题目分配临时 ID，并存储到会话缓存
        questions_data = []
        for i, q in enumerate(questions):
            q_id = i + 1
            q_data = {
                "id": q_id,
                "type": q.get("type", "choice"),
                "question": q.get("question", ""),
                "options": q.get("options"),
            }
            questions_data.append(q_data)

            answer_placeholder = PracticeAnswer(
                session_id=session.id,
                question_id=q_id,
                user_answer="",
                is_correct=None,
                ai_feedback=None,
            )
            answer_placeholder.ai_feedback = json.dumps({
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "type": q.get("type", "choice"),
                "question": q.get("question", ""),
            }, ensure_ascii=False)
            db.add(answer_placeholder)

        db.commit()

        logger.info(f"智能出题成功: session={session.id}, questions={len(questions_data)}")

        return {
            "session_id": session.id,
            "questions": questions_data,
            "total_questions": len(questions_data),
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"开始练习失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/submit", response_model=AnswerResult)
async def submit_answer(
    session_id: int,
    data: SubmitAnswerRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """提交单题答案"""
    try:
        placeholder = db.query(PracticeAnswer).filter(
            PracticeAnswer.session_id == session_id,
            PracticeAnswer.question_id == data.question_id,
        ).first()

        if not placeholder:
            raise HTTPException(status_code=404, detail="题目不存在")

        try:
            meta = json.loads(placeholder.ai_feedback or "{}")
        except json.JSONDecodeError:
            meta = {}

        correct_answer = meta.get("correct_answer", "")
        explanation = meta.get("explanation", "")
        q_type = meta.get("type", "choice")
        question_text = meta.get("question", "")

        is_correct = None
        feedback = ""

        if q_type == "choice":
            is_correct = data.user_answer.strip() == correct_answer.strip()
            if is_correct:
                feedback = f"✅ 回答正确！\n\n**解析：** {explanation}"
            else:
                feedback = f"❌ 回答错误。\n\n**正确答案：** {correct_answer}\n\n**解析：** {explanation}"
        else:
            grading_prompt = ESSAY_GRADING_PROMPT.format(
                question=question_text,
                correct_answer=correct_answer,
                user_answer=data.user_answer,
            )
            grading_response = chat_block(
                messages=[{"role": "user", "content": grading_prompt}],
            )
            grading_result = _parse_json_response(grading_response)
            is_correct = grading_result.get("is_correct", False)
            feedback = grading_result.get("feedback", "AI 批改完成")

        placeholder.user_answer = data.user_answer
        placeholder.is_correct = is_correct
        placeholder.ai_feedback = feedback
        db.commit()

        return AnswerResult(
            question_id=data.question_id,
            is_correct=is_correct,
            correct_answer=correct_answer,
            explanation=explanation,
            feedback=feedback,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"提交答案失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/finish")
async def finish_practice(
    session_id: int,
    duration: int = 0,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """完成练习（汇总分数）"""
    try:
        session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="练习记录不存在")

        answers = db.query(PracticeAnswer).filter(
            PracticeAnswer.session_id == session_id,
            PracticeAnswer.user_answer != "",
        ).all()

        correct_count = sum(1 for a in answers if a.is_correct is True)
        total = len(answers)
        score = round(correct_count / total * 100) if total > 0 else 0

        session.correct_answers = correct_count
        session.score = score
        session.duration = duration
        db.commit()

        return {
            "session_id": session_id,
            "total_questions": total,
            "correct_answers": correct_count,
            "score": score,
            "duration": duration,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"完成练习失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/result")
async def get_practice_result(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取练习结果"""
    try:
        session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="练习记录不存在")

        answers = db.query(PracticeAnswer).filter(
            PracticeAnswer.session_id == session_id,
            PracticeAnswer.user_answer != "",
        ).all()

        correct_count = sum(1 for a in answers if a.is_correct is True)
        total = len(answers)

        return {
            "session_id": session_id,
            "total_questions": total,
            "correct_count": correct_count,
            "score": session.score or 0,
            "duration": session.duration or 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取练习结果失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== 辅助函数 =====

def _get_knowledge_content(knowledge_base: Optional[str], db: Session) -> str:
    """从知识库获取内容片段，用于出题"""
    query = db.query(KnowledgeChunk)

    if knowledge_base and knowledge_base != "all":
        try:
            doc_id = int(knowledge_base)
            query = query.filter(KnowledgeChunk.document_id == doc_id)
        except ValueError:
            pass

    chunks = query.all()
    if not chunks:
        return ""

    max_chunks = min(8, len(chunks))
    selected_chunks = random.sample(chunks, max_chunks)

    content_parts = []
    for chunk in selected_chunks:
        doc = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.id == chunk.document_id
        ).first()
        doc_name = doc.name if doc else "未知文档"
        content_parts.append(f"【来源：{doc_name}】\n{chunk.content}")

    return "\n\n---\n\n".join(content_parts)


def _parse_questions(llm_response: str) -> list:
    """解析 LLM 返回的 JSON 题目列表"""
    if not llm_response:
        return []

    try:
        questions = json.loads(llm_response.strip())
        if isinstance(questions, list):
            return questions
    except json.JSONDecodeError:
        pass

    try:
        json_match = re.search(r'```(?:json)?\s*(\[[\s\S]*?\])\s*```', llm_response)
        if json_match:
            return json.loads(json_match.group(1))

        json_match = re.search(r'(\[[\s\S]*\])', llm_response)
        if json_match:
            return json.loads(json_match.group(1))
    except json.JSONDecodeError:
        pass

    logger.error(f"无法解析 LLM 出题结果: {llm_response[:200]}")
    return []


def _parse_json_response(llm_response: str) -> dict:
    """解析 LLM 返回的 JSON 对象"""
    if not llm_response:
        return {}

    try:
        return json.loads(llm_response.strip())
    except json.JSONDecodeError:
        pass

    try:
        json_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', llm_response)
        if json_match:
            return json.loads(json_match.group(1))

        json_match = re.search(r'(\{[\s\S]*\})', llm_response)
        if json_match:
            return json.loads(json_match.group(1))
    except json.JSONDecodeError:
        pass

    logger.error(f"无法解析 LLM 批改结果: {llm_response[:200]}")
    return {}
