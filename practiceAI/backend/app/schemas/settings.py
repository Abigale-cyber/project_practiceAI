from pydantic import BaseModel
from typing import Optional, List, Any

class QuizTopic(BaseModel):
    """单个主题配置"""
    name: str = ""                     # 主题名称
    knowledge_base: str = "all"        # 关联的知识库 ID
    question_count: int = 3            # 该主题出几道题

class PracticeSettingsResponse(BaseModel):
    # 出题设置
    quiz_topics: List[Any] = []        # 主题列表
    question_count: int = 5            # 默认出题数（兼容旧逻辑）
    question_types: List[str] = ["choice", "essay"]
    quiz_difficulty: str = "medium"
    quiz_focus: List[str] = ["concept", "compare", "apply", "process"]
    quiz_custom_instruction: str = ""

    # 批改设置
    grading_strictness: str = "medium"
    grading_style: str = "encouraging"
    passing_score: int = 60
    show_answer: bool = True
    grading_custom_instruction: str = ""

    # 通用设置
    time_limit: int = 0

    class Config:
        from_attributes = True

class PracticeSettingsUpdate(BaseModel):
    quiz_topics: Optional[List[Any]] = None
    question_count: Optional[int] = None
    question_types: Optional[List[str]] = None
    quiz_difficulty: Optional[str] = None
    quiz_focus: Optional[List[str]] = None
    quiz_custom_instruction: Optional[str] = None

    grading_strictness: Optional[str] = None
    grading_style: Optional[str] = None
    passing_score: Optional[int] = None
    show_answer: Optional[bool] = None
    grading_custom_instruction: Optional[str] = None

    time_limit: Optional[int] = None
