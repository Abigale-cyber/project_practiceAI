"""
RAG (Retrieval-Augmented Generation) 检索增强生成

检索策略：
1. 优先使用 Milvus 向量数据库进行近邻搜索（高性能）
2. 降级策略：Milvus 不可用时回退到 PostgreSQL 全表扫描（兼容模式）

流程：
1. 将用户问题转为向量
2. 从向量数据库中检索最相似的文档块
3. 构建带知识库上下文的 LLM Prompt
"""

from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models.knowledge import KnowledgeDocument, KnowledgeChunk
from service.embedding import generate_embedding, cosine_similarity
from service.prompts import build_chat_prompt
import logging

logger = logging.getLogger("practiceAI")


def retrieve_relevant_chunks(
    question: str,
    db: Session,
    top_k: int = 5,
    similarity_threshold: float = 0.3,
    document_ids: Optional[List[int]] = None,
) -> List[Dict]:
    """
    检索与问题最相关的文档块。

    优先走 Milvus 向量检索，Milvus 不可用时降级为 PostgreSQL 全表扫描。

    :param question: 用户的问题
    :param db: SQLAlchemy 数据库 session
    :param top_k: 返回最相关的 N 个块
    :param similarity_threshold: 最低相似度阈值
    :param document_ids: 可选，限制检索范围的文档 ID 列表
    :return: 排序后的匹配结果列表
    """
    # 1. 生成问题的 embedding
    question_embedding = generate_embedding(question)
    if not question_embedding:
        logger.warning("问题向量化失败，跳过 RAG 检索")
        return []

    # 2. 尝试 Milvus 检索
    results = _search_via_milvus(
        question_embedding=question_embedding,
        db=db,
        top_k=top_k,
        similarity_threshold=similarity_threshold,
        document_ids=document_ids,
    )

    if results is not None:
        return results

    # 3. 降级到 PostgreSQL 全表检索
    logger.info("降级为 PostgreSQL 全表检索")
    return _search_via_postgres(
        question_embedding=question_embedding,
        db=db,
        top_k=top_k,
        similarity_threshold=similarity_threshold,
        document_ids=document_ids,
    )


def _search_via_milvus(
    question_embedding: List[float],
    db: Session,
    top_k: int,
    similarity_threshold: float,
    document_ids: Optional[List[int]],
) -> Optional[List[Dict]]:
    """
    通过 Milvus 进行向量搜索。

    返回 None 表示 Milvus 不可用需降级。
    """
    try:
        from service.milvus_service import is_available, search_similar

        if not is_available():
            return None  # 降级信号

        # 向量近邻搜索
        matches = search_similar(
            query_embedding=question_embedding,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            document_ids=document_ids,
        )

        if not matches:
            return []

        # 用 chunk_id 从 PostgreSQL 获取文本内容
        chunk_ids = [m["chunk_id"] for m in matches]
        chunks_db = db.query(KnowledgeChunk).filter(
            KnowledgeChunk.id.in_(chunk_ids)
        ).all()
        chunk_map = {c.id: c for c in chunks_db}

        results = []
        for m in matches:
            chunk = chunk_map.get(m["chunk_id"])
            if not chunk:
                continue

            doc = db.query(KnowledgeDocument).filter(
                KnowledgeDocument.id == chunk.document_id
            ).first()

            results.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_name": doc.name if doc else "未知文档",
                "content": chunk.content,
                "similarity": m["score"],
            })

        logger.info(f"Milvus RAG 检索到 {len(results)} 条结果")
        return results

    except ImportError:
        logger.warning("pymilvus 未安装，降级到 PostgreSQL")
        return None
    except Exception as e:
        logger.warning(f"Milvus 检索异常: {e}，降级到 PostgreSQL")
        return None


def _search_via_postgres(
    question_embedding: List[float],
    db: Session,
    top_k: int,
    similarity_threshold: float,
    document_ids: Optional[List[int]],
) -> List[Dict]:
    """
    PostgreSQL 全表扫描检索（降级方案）。
    将所有 chunk 的 embedding 拉到内存，在 Python 中计算余弦相似度。
    """
    try:
        query = db.query(KnowledgeChunk).filter(KnowledgeChunk.embedding.isnot(None))

        if document_ids:
            query = query.filter(KnowledgeChunk.document_id.in_(document_ids))

        chunks = query.all()
        if not chunks:
            return []

        # 计算相似度
        scored = []
        for chunk in chunks:
            if not chunk.embedding:
                continue
            sim = cosine_similarity(question_embedding, chunk.embedding)
            if sim >= similarity_threshold:
                scored.append((chunk, sim))

        # 按相似度排序
        scored.sort(key=lambda x: x[1], reverse=True)
        top_matches = scored[:top_k]

        results = []
        for chunk, sim in top_matches:
            doc = db.query(KnowledgeDocument).filter(
                KnowledgeDocument.id == chunk.document_id
            ).first()
            results.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_name": doc.name if doc else "未知文档",
                "content": chunk.content,
                "similarity": round(sim, 4),
            })

        logger.info(f"PostgreSQL RAG 检索到 {len(results)} 条结果 (降级模式)")
        return results

    except Exception as e:
        logger.error(f"PostgreSQL RAG 检索失败: {e}")
        return []


def build_rag_prompt(question: str, retrieved_content: List[Dict]) -> str:
    """
    构建 RAG Prompt（将检索结果注入到系统提示中）。
    """
    if not retrieved_content:
        references = "（未检索到相关参考内容）"
    else:
        ref_parts = []
        for i, item in enumerate(retrieved_content, 1):
            ref_parts.append(
                f"[{i}] 来源: {item['document_name']}\n"
                f"内容: {item['content']}\n"
                f"相似度: {item['similarity']}"
            )
        references = "\n\n".join(ref_parts)

    return build_chat_prompt(question, references)


def format_citations(retrieved_content: List[Dict]) -> List[Dict]:
    """格式化引用信息（返回给前端展示）"""
    citations = []
    for item in retrieved_content:
        citations.append({
            "id": item.get("chunk_id"),
            "document_name": item.get("document_name", ""),
            "content": item.get("content", "")[:200] + "..." if len(item.get("content", "")) > 200 else item.get("content", ""),
            "similarity": item.get("similarity", 0),
        })
    return citations
