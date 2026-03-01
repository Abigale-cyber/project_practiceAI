from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from utils.database import get_db
from models.static_question import StaticQuestion
from schemas.static_question import StaticQuestionCreate, StaticQuestionUpdate, StaticQuestionResponse
from service.auth import get_current_user

router = APIRouter(prefix="/api/admin/static-questions", tags=["手工题库"])

@router.get("", response_model=List[StaticQuestionResponse])
async def list_questions(
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(StaticQuestion)
    if category and category != 'all':
        query = query.filter(StaticQuestion.category == category)
    if type and type != 'all':
        query = query.filter(StaticQuestion.type == type)
    if search:
        query = query.filter(or_(
            StaticQuestion.question.ilike(f"%{search}%"),
            StaticQuestion.correct_answer.ilike(f"%{search}%")
        ))
    
    return query.order_by(StaticQuestion.created_at.desc()).all()

@router.post("", response_model=StaticQuestionResponse)
async def create_question(
    data: StaticQuestionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    question_data = data.model_dump()
    question_data['created_by'] = current_user['user_id']
    question = StaticQuestion(**question_data)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

@router.put("/{question_id}", response_model=StaticQuestionResponse)
async def update_question(
    question_id: int,
    data: StaticQuestionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    question = db.query(StaticQuestion).filter(StaticQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    
    db.commit()
    db.refresh(question)
    return question

@router.delete("/{question_id}")
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    question = db.query(StaticQuestion).filter(StaticQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    db.delete(question)
    db.commit()
    return {"message": "Success"}
