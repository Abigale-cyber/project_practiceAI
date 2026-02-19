from pydantic import BaseModel
from typing import Optional, List

class StartPracticeRequest(BaseModel):
    knowledge_base: str = "all"
    question_type: str = "all"      # all / choice / essay
    question_count: int = 10

class SubmitAnswerRequest(BaseModel):
    question_id: int
    user_answer: str

class AnswerResult(BaseModel):
    question_id: int
    is_correct: Optional[bool]
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    feedback: Optional[str] = None
    ai_feedback: Optional[str] = None  # backward compat

class PracticeSessionResponse(BaseModel):
    id: int
    knowledge_base: Optional[str]
    question_type: str
    total_questions: int
    correct_answers: int
    score: int
    duration: int
    created_at: str

    class Config:
        from_attributes = True

class PracticeResultResponse(BaseModel):
    session_id: int
    total_questions: int
    correct_answers: int
    score: int
    duration: int
    answers: List[dict]
