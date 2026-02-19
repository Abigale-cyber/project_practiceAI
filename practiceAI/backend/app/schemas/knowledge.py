from pydantic import BaseModel
from typing import Optional, List


class KnowledgeDocumentResponse(BaseModel):
    id: int
    name: str
    file_type: Optional[str]
    file_size: Optional[str]
    category: str
    status: str
    chunk_count: Optional[int] = 0
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class KnowledgeStatsResponse(BaseModel):
    total_documents: int
    processed_documents: int
    processing_count: Optional[int] = 0
    total_chunks: Optional[int] = 0
    categories: List[str]
