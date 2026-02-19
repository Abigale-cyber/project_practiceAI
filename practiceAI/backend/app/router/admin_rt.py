from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from utils.database import get_db
from utils import logger
from models.user import User
from models.question import Question
from models.knowledge import KnowledgeDocument
from models.practice import PracticeSession

router = APIRouter(prefix="/api/admin/dashboard", tags=["管理概览"])


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    """获取概览统计"""
    try:
        student_count = db.query(User).filter(User.role == "student").count()
        question_count = db.query(Question).count()
        document_count = db.query(KnowledgeDocument).count()
        practice_count = db.query(PracticeSession).count()

        avg_score = db.query(sql_func.avg(PracticeSession.score)).filter(
            PracticeSession.score > 0
        ).scalar() or 0

        return {
            "student_count": student_count,
            "question_count": question_count,
            "document_count": document_count,
            "practice_count": practice_count,
            "average_score": round(float(avg_score)),
        }
    except Exception as e:
        logger.error(f"获取概览数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """获取最近活动"""
    try:
        sessions = db.query(PracticeSession).order_by(
            PracticeSession.created_at.desc()
        ).limit(limit).all()

        activities = []
        for s in sessions:
            user = db.query(User).filter(User.id == s.user_id).first()
            activities.append({
                "type": "practice",
                "user": user.username if user else "未知用户",
                "description": f"完成了一次{s.question_type or '综合'}练习",
                "score": s.score,
                "created_at": s.created_at.isoformat() if s.created_at else "",
            })

        return activities
    except Exception as e:
        logger.error(f"获取最近活动失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular-questions")
async def get_popular_questions(
    limit: int = 5,
    db: Session = Depends(get_db),
):
    """获取热门问题（最多被练习的）"""
    try:
        from models.practice import PracticeAnswer

        popular = db.query(
            PracticeAnswer.question_id,
            sql_func.count(PracticeAnswer.id).label("attempt_count"),
        ).group_by(PracticeAnswer.question_id).order_by(
            sql_func.count(PracticeAnswer.id).desc()
        ).limit(limit).all()

        result = []
        for question_id, count in popular:
            question = db.query(Question).filter(Question.id == question_id).first()
            if question:
                result.append({
                    "id": question.id,
                    "question": question.question,
                    "type": question.type,
                    "attempt_count": count,
                })

        return result
    except Exception as e:
        logger.error(f"获取热门问题失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
