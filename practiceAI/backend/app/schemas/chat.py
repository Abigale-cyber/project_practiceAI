from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    document_ids: Optional[List[int]] = None
    file_context: Optional[str] = None
    attached_docs: Optional[List[str]] = None

class ChatSessionResponse(BaseModel):
    session_id: str
    status: str
    message: str

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: Optional[List[dict]]
    suggested_questions: Optional[List[str]]
    attached_docs: Optional[List[str]]
    created_at: str

class ChatSessionListItem(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
