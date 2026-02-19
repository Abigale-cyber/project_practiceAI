from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from utils.database import get_db
from utils import logger
from models.question import Question
from schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse

router = APIRouter(prefix="/api/admin/questions", tags=["题库管理"])

# 临时硬编码 user_id，跳过 JWT 认证（测试用）
TEST_USER_ID = 1


@router.get("/", response_model=List[QuestionResponse])
async def list_questions(
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """获取题目列表（支持筛选）"""
    try:
        query = db.query(Question)

        if category and category != "all":
            query = query.filter(Question.category == category)
        if type and type != "all":
            query = query.filter(Question.type == type)
        if search:
            query = query.filter(Question.question.ilike(f"%{search}%"))

        questions = query.order_by(Question.created_at.desc()).all()

        return [
            QuestionResponse(
                id=q.id,
                type=q.type,
                question=q.question,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                category=q.category,
                difficulty=q.difficulty,
                created_at=q.created_at.isoformat() if q.created_at else "",
                updated_at=q.updated_at.isoformat() if q.updated_at else "",
            )
            for q in questions
        ]
    except Exception as e:
        logger.error(f"获取题目列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=QuestionResponse)
async def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
):
    """创建题目"""
    try:
        question = Question(
            type=data.type,
            question=data.question,
            options=data.options,
            correct_answer=data.correct_answer,
            explanation=data.explanation,
            category=data.category,
            difficulty=data.difficulty,
            created_by=TEST_USER_ID,
        )
        db.add(question)
        db.commit()
        db.refresh(question)

        return QuestionResponse(
            id=question.id,
            type=question.type,
            question=question.question,
            options=question.options,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            category=question.category,
            difficulty=question.difficulty,
            created_at=question.created_at.isoformat() if question.created_at else "",
            updated_at=question.updated_at.isoformat() if question.updated_at else "",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"创建题目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
):
    """修改题目"""
    try:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")

        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(question, key, value)

        db.commit()
        db.refresh(question)

        return QuestionResponse(
            id=question.id,
            type=question.type,
            question=question.question,
            options=question.options,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            category=question.category,
            difficulty=question.difficulty,
            created_at=question.created_at.isoformat() if question.created_at else "",
            updated_at=question.updated_at.isoformat() if question.updated_at else "",
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"修改题目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{question_id}")
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
):
    """删除题目"""
    try:
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")

        db.delete(question)
        db.commit()
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除题目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
