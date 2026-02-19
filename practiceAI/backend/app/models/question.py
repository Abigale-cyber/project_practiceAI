from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from models.base import Base


class QuestionSet(Base):
    """题目集 —— 教师创建的一组配置，对应一次出题"""
    __tablename__ = 'question_sets'
    id = Column(Integer, primary_key=True)
    topic_name = Column(String(255), nullable=False)         # 主题名称
    knowledge_base_id = Column(String(100))                  # 关联知识库 ID
    knowledge_base_name = Column(String(255))                # 知识库名称（冗余存储）
    question_count = Column(Integer, default=3)              # 出题数量
    question_types = Column(JSON, default=["choice"])        # 题型
    difficulty = Column(String(20), default='medium')        # 难度
    focus = Column(JSON, default=[])                         # 考查侧重
    custom_instruction = Column(Text, default='')            # 自定义指令
    status = Column(String(20), default='draft')             # draft / generating / ready / error
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Question(Base):
    """预生成题目 —— 教师配置时由 LLM 生成，永久存储"""
    __tablename__ = 'questions'
    id = Column(Integer, primary_key=True)
    set_id = Column(Integer, ForeignKey('question_sets.id', ondelete='CASCADE'))
    question_type = Column(String(20), nullable=False)       # choice / essay
    content = Column(Text, nullable=False)                   # 题目内容
    options = Column(JSON)                                   # 选择题选项 {"A":"...", "B":"...", ...}
    answer = Column(Text, nullable=False)                    # 正确答案
    explanation = Column(Text, default='')                   # 解析
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
