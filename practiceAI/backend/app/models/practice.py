from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from models.base import Base

class PracticeSession(Base):
    __tablename__ = 'practice_sessions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    knowledge_base = Column(String(100))
    question_type = Column(String(20), default='all')
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    score = Column(Integer, default=0)
    duration = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class PracticeAnswer(Base):
    __tablename__ = 'practice_answers'
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('practice_sessions.id', ondelete='CASCADE'))
    question_id = Column(Integer)  # 临时 ID，由 LLM 出题时分配
    user_answer = Column(Text)
    is_correct = Column(Boolean)
    ai_feedback = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
