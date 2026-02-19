"""
RAG 检索服务 —— 从知识库中检索相关内容

参考 swxy/backend/app/service/core/retrieval.py 和 chat.py，
使用 numpy 余弦相似度替代 Elasticsearch 混合检索。
"""

import numpy as np
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models.knowledge import KnowledgeChunk, KnowledgeDocument
from service.embedding import generate_embedding, cosine_similarity
from utils import logger


def retrieve_relevant_chunks(
    question: str,
    db: Session,
    top_k: int = 5,
    similarity_threshold: float = 0.3,
    document_ids: Optional[List[int]] = None,
) -> List[Dict]:
    """
    根据用户问题检索最相关的知识库内容。

    流程（参考 swxy 的 retrieve_content）：
    1. 将用户问题转为向量
    2. 从数据库加载所有已嵌入的 chunk
    3. 计算余弦相似度
    4. 返回 top-k 结果

    :param question: 用户问题
    :param db: 数据库会话
    :param top_k: 返回最相关的 k 个结果
    :param similarity_threshold: 相似度阈值
    :param document_ids: 仅从指定文档中检索（None 则检索全部）
    :return: [{"id": 1, "content": "...", "document_name": "...", "similarity": 0.85}]
    """
    # 1. 生成问题向量
    question_embedding = generate_embedding(question)
    if question_embedding is None:
        logger.error("无法为问题生成向量")
        return []

    # 2. 查询有 embedding 的 chunk（可按文档过滤）
    query = db.query(KnowledgeChunk).filter(
        KnowledgeChunk.embedding.isnot(None)
    )
    if document_ids:
        query = query.filter(KnowledgeChunk.document_id.in_(document_ids))
        logger.info(f"RAG 限定检索文档 ID: {document_ids}")
    chunks = query.all()

    if not chunks:
        logger.info("知识库中暂无已嵌入的文档")
        return []

    # 3. 计算相似度
    similarities = []
    for chunk in chunks:
        if chunk.embedding:
            sim = cosine_similarity(question_embedding, chunk.embedding)
            similarities.append((chunk, sim))

    # 4. 排序并取 top-k
    similarities.sort(key=lambda x: x[1], reverse=True)
    top_results = similarities[:top_k]

    # 5. 过滤低于阈值的结果并格式化（参考 swxy 的 extracted_data 格式）
    results = []
    for i, (chunk, sim) in enumerate(top_results):
        if sim < similarity_threshold:
            continue

        # 获取文档名称
        doc = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.id == chunk.document_id
        ).first()
        doc_name = doc.name if doc else "未知文档"

        results.append({
            "id": i + 1,
            "document_id": chunk.document_id,
            "document_name": doc_name,
            "content": chunk.content,
            "similarity": round(sim, 4),
        })

    logger.info(f"检索到 {len(results)} 条相关内容 (最高相似度: {results[0]['similarity'] if results else 0})")
    return results


def build_rag_prompt(question: str, retrieved_content: List[Dict]) -> str:
    """
    构建带有知识库上下文的提示词。

    使用集中管理的 CHAT_SYSTEM_PROMPT（智能问答 Prompt）。

    :param question: 用户问题
    :param retrieved_content: 检索到的内容列表
    :return: 完整的带上下文 prompt
    """
    from service.prompts import build_chat_prompt

    if not retrieved_content:
        formatted_references = "暂无相关参考内容"
    else:
        refs = []
        for ref in retrieved_content:
            refs.append(f"[{ref['id']}] （来源：{ref['document_name']}）\n{ref['content']}")
        formatted_references = "\n\n".join(refs)

    return build_chat_prompt(question, formatted_references)


def format_citations(retrieved_content: List[Dict]) -> List[Dict]:
    """
    将检索结果格式化为前端可展示的引用格式。

    :param retrieved_content: 检索结果
    :return: [{\"id\": 1, \"document_name\": \"...\", \"content\": \"...\"}]
    """
    return [
        {
            "id": ref["id"],
            "document_name": ref["document_name"],
            "content": ref["content"][:200] + "..." if len(ref["content"]) > 200 else ref["content"],
        }
        for ref in retrieved_content
    ]
