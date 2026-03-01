from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from models.base import Base

class PracticeSettings(Base):
    __tablename__ = 'practice_settings'
    id = Column(Integer, primary_key=True)

    # ===== 出题设置 =====
    quiz_topics = Column(JSON, default=[])                 # 主题列表: [{name, knowledge_base, question_count}]
    question_count = Column(Integer, default=5)            # 默认每主题出题数量(兼容)
    question_types = Column(JSON, default=["choice", "essay"])  # 题型
    quiz_difficulty = Column(String(20), default='medium')  # 难度: easy/medium/hard
    quiz_focus = Column(JSON, default=["concept", "compare", "apply", "process"])  # 考查侧重
    quiz_custom_instruction = Column(Text, default='')     # 自定义出题指令

    # ===== 批改设置 =====
    grading_strictness = Column(String(20), default='medium')  # 批改严格程度: lenient/medium/strict
    grading_style = Column(String(20), default='encouraging')  # 反馈风格: encouraging/objective/strict
    passing_score = Column(Integer, default=60)              # 及格线
    show_answer = Column(Boolean, default=True)              # 答错后展示参考答案
    grading_custom_instruction = Column(Text, default='')    # 自定义批改指令

    # ===== 通用设置 =====
    time_limit = Column(Integer, default=0)                # 答题时限(分钟)
    question_source = Column(String(20), default='ai_generated') # ai_generated 或 static_bank

    # ===== 旧字段保留兼容 =====
    knowledge_base = Column(String(50), default='all')
    difficulty = Column(String(20), default='all')
    random_order = Column(Boolean, default=True)
    show_explanation = Column(Boolean, default=True)

    updated_by = Column(Integer, ForeignKey('users.id'))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
