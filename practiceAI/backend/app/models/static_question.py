from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from models.base import Base

class StaticQuestion(Base):
    """传统手工题库"""
    __tablename__ = 'static_questions'
    id = Column(Integer, primary_key=True)
    type = Column(String(20), nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON)
    correct_answer = Column(Text)
    explanation = Column(Text)
    category = Column(String(100), default='未分类')
    difficulty = Column(String(20), default='medium')
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
