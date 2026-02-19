from pydantic import BaseModel
from typing import Optional, List

class QuestionCreate(BaseModel):
    type: str                       # choice / essay
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    category: str = "未分类"
    difficulty: str = "medium"

class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None

class QuestionResponse(BaseModel):
    id: int
    type: str
    question: str
    options: Optional[List[str]]
    correct_answer: Optional[str]
    explanation: Optional[str]
    category: str
    difficulty: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
