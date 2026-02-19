from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from utils.database import get_db
from utils import logger
from models.practice import PracticeSession, PracticeAnswer
from models.chat import ChatSession
from models.question import Question

router = APIRouter(prefix="/api/history", tags=["历史记录"])

# 临时硬编码 user_id，跳过 JWT 认证（测试用）
TEST_USER_ID = 1


@router.get("/practice")
async def get_practice_history(
    db: Session = Depends(get_db),
):
    """获取练习历史列表"""
    try:
        sessions = db.query(PracticeSession).filter(
            PracticeSession.user_id == TEST_USER_ID
        ).order_by(PracticeSession.created_at.desc()).all()

        return [
            {
                "id": s.id,
                "knowledge_base": s.knowledge_base,
                "question_type": s.question_type,
                "total_questions": s.total_questions,
                "correct_answers": s.correct_answers,
                "score": s.score,
                "duration": s.duration,
                "created_at": s.created_at.isoformat() if s.created_at else "",
            }
            for s in sessions
        ]
    except Exception as e:
        logger.error(f"获取练习历史失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/practice/{session_id}")
async def get_practice_detail(
    session_id: int,
    db: Session = Depends(get_db),
):
    """获取某次练习详情"""
    try:
        session = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="练习记录不存在")

        answers = db.query(PracticeAnswer).filter(PracticeAnswer.session_id == session_id).all()

        answers_data = []
        for a in answers:
            question = db.query(Question).filter(Question.id == a.question_id).first()
            answers_data.append({
                "question_id": a.question_id,
                "question": question.question if question else "",
                "type": question.type if question else "",
                "user_answer": a.user_answer,
                "is_correct": a.is_correct,
                "ai_feedback": a.ai_feedback,
            })

        return {
            "id": session.id,
            "total_questions": session.total_questions,
            "correct_answers": session.correct_answers,
            "score": session.score,
            "duration": session.duration,
            "created_at": session.created_at.isoformat() if session.created_at else "",
            "answers": answers_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取练习详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat")
async def get_chat_history(
    db: Session = Depends(get_db),
):
    """获取问答历史列表"""
    try:
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == TEST_USER_ID
        ).order_by(ChatSession.updated_at.desc()).all()

        return [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat() if s.created_at else "",
                "updated_at": s.updated_at.isoformat() if s.updated_at else "",
            }
            for s in sessions
        ]
    except Exception as e:
        logger.error(f"获取问答历史失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_student_stats(
    db: Session = Depends(get_db),
):
    """获取学员统计摘要"""
    try:
        practice_count = db.query(PracticeSession).filter(
            PracticeSession.user_id == TEST_USER_ID
        ).count()

        avg_score = db.query(sql_func.avg(PracticeSession.score)).filter(
            PracticeSession.user_id == TEST_USER_ID,
            PracticeSession.score > 0,
        ).scalar() or 0

        chat_count = db.query(ChatSession).filter(
            ChatSession.user_id == TEST_USER_ID
        ).count()

        return {
            "practice_count": practice_count,
            "average_score": round(float(avg_score)),
            "chat_count": chat_count,
        }
    except Exception as e:
        logger.error(f"获取统计数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
