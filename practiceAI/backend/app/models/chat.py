from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from models.base import Base

class ChatSession(Base):
    __tablename__ = 'chat_sessions'
    id = Column(String(16), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    title = Column(String(255), default='新会话')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(16), ForeignKey('chat_sessions.id', ondelete='CASCADE'))
    role = Column(String(20), nullable=False)      # user / assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON)
    suggested_questions = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
