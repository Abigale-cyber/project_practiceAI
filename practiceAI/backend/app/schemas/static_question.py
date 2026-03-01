from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class StaticQuestionBase(BaseModel):
    type: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    category: Optional[str] = "未分类"
    difficulty: Optional[str] = "medium"

class StaticQuestionCreate(StaticQuestionBase):
    pass

class StaticQuestionUpdate(StaticQuestionBase):
    pass

class StaticQuestionResponse(StaticQuestionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
