from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from models.base import Base


class KnowledgeDocument(Base):
    __tablename__ = 'knowledge_documents'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_size = Column(String(50))
    category = Column(String(100), default='未分类')
    status = Column(String(20), default='processing')  # processing / processed / error
    chunk_count = Column(Integer, default=0)            # 切片数量
    uploaded_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class KnowledgeChunk(Base):
    """文档切片表 —— 存储文本分块及其向量嵌入"""
    __tablename__ = 'knowledge_chunks'
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('knowledge_documents.id', ondelete='CASCADE'))
    chunk_index = Column(Integer, nullable=False)       # 在文档中的位置序号
    content = Column(Text, nullable=False)              # 切片文本内容
    embedding = Column(JSON)                            # 向量嵌入 (JSON 数组)
    created_at = Column(DateTime, server_default=func.now())
