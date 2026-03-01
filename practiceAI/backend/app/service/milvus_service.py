"""
Milvus 向量数据库服务 —— 替代内存全表扫描 RAG 检索

使用 Milvus 存储和检索向量，支持：
1. 初始化 Collection（自动建表 + 索引）
2. 批量写入向量
3. 向量近邻搜索（替代 Python 层面的余弦相似度）
4. 从 PostgreSQL 同步已有数据到 Milvus
"""

import os
import logging
from typing import List, Dict, Optional

logger = logging.getLogger("practiceAI")

MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = int(os.getenv("MILVUS_PORT", "19530"))
COLLECTION_NAME = "knowledge_chunks"
EMBEDDING_DIM = 1024  # BAAI/bge-m3 维度

# Milvus 连接（延迟初始化）
_milvus_connected = False


def _connect_milvus():
    """连接 Milvus（惰性连接，首次调用时创建）"""
    global _milvus_connected
    if _milvus_connected:
        return True
    try:
        from pymilvus import connections
        connections.connect(
            alias="default",
            host=MILVUS_HOST,
            port=MILVUS_PORT,
        )
        _milvus_connected = True
        logger.info(f"Milvus 连接成功: {MILVUS_HOST}:{MILVUS_PORT}")
        return True
    except Exception as e:
        logger.warning(f"Milvus 连接失败: {e}，将降级为 PostgreSQL 全表检索")
        return False


def init_collection():
    """初始化 Milvus Collection（如不存在则创建）"""
    if not _connect_milvus():
        return False

    try:
        from pymilvus import (
            Collection, CollectionSchema, FieldSchema, DataType, utility
        )

        if utility.has_collection(COLLECTION_NAME):
            logger.info(f"Milvus collection '{COLLECTION_NAME}' 已存在")
            collection = Collection(COLLECTION_NAME)
            collection.load()
            return True

        # 定义 Schema
        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=False,
                        description="对应 PostgreSQL 中 knowledge_chunks.id"),
            FieldSchema(name="document_id", dtype=DataType.INT64,
                        description="所属文档 ID"),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=EMBEDDING_DIM,
                        description="文本嵌入向量 (bge-m3, 1024d)"),
        ]
        schema = CollectionSchema(
            fields=fields,
            description="知识库文档块的向量索引",
        )
        collection = Collection(name=COLLECTION_NAME, schema=schema)

        # 创建 IVF_FLAT 索引
        index_params = {
            "metric_type": "COSINE",
            "index_type": "IVF_FLAT",
            "params": {"nlist": 128},
        }
        collection.create_index(field_name="embedding", index_params=index_params)
        collection.load()

        logger.info(f"Milvus collection '{COLLECTION_NAME}' 创建成功（IVF_FLAT, COSINE）")
        return True
    except Exception as e:
        logger.error(f"Milvus collection 初始化失败: {e}")
        return False


def insert_vectors(chunk_ids: List[int], document_ids: List[int], embeddings: List[List[float]]) -> bool:
    """
    批量插入向量到 Milvus。
    
    :param chunk_ids: PostgreSQL 中的 chunk ID 列表
    :param document_ids: 对应的 document_id
    :param embeddings: 嵌入向量列表
    :return: 是否成功
    """
    if not _connect_milvus():
        return False

    if not chunk_ids or not embeddings:
        return True

    try:
        from pymilvus import Collection
        init_collection()  # 确保 collection 存在

        collection = Collection(COLLECTION_NAME)

        # 先删除已有的（upsert 语义）
        try:
            collection.delete(f"id in {chunk_ids}")
        except Exception:
            pass  # 首次插入时没有数据，忽略

        data = [
            chunk_ids,      # id
            document_ids,   # document_id
            embeddings,     # embedding
        ]
        collection.insert(data)
        collection.flush()

        logger.info(f"Milvus 插入 {len(chunk_ids)} 条向量")
        return True
    except Exception as e:
        logger.error(f"Milvus 插入失败: {e}")
        return False


def search_similar(
    query_embedding: List[float],
    top_k: int = 5,
    similarity_threshold: float = 0.3,
    document_ids: Optional[List[int]] = None,
) -> List[Dict]:
    """
    向量近邻搜索 —— 替代 rag.py 中的全表扫描。
    
    :param query_embedding: 查询向量
    :param top_k: 返回数量
    :param similarity_threshold: 最低相似度阈值
    :param document_ids: 可选，限制检索范围的文档 ID
    :return: [{"chunk_id": int, "document_id": int, "score": float}, ...]
    """
    if not _connect_milvus():
        return []

    try:
        from pymilvus import Collection
        collection = Collection(COLLECTION_NAME)

        search_params = {
            "metric_type": "COSINE",
            "params": {"nprobe": 16},
        }

        # 构建过滤表达式
        expr = None
        if document_ids:
            expr = f"document_id in {document_ids}"

        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            expr=expr,
            output_fields=["document_id"],
        )

        matches = []
        for hits in results:
            for hit in hits:
                score = hit.score  # Milvus COSINE 返回相似度值 (0~1)
                if score >= similarity_threshold:
                    matches.append({
                        "chunk_id": hit.id,
                        "document_id": hit.entity.get("document_id"),
                        "score": round(score, 4),
                    })

        logger.info(f"Milvus 检索到 {len(matches)} 条结果 (threshold={similarity_threshold})")
        return matches
    except Exception as e:
        logger.error(f"Milvus 检索失败: {e}")
        return []


def delete_by_document(document_id: int) -> bool:
    """删除某篇文档的所有向量"""
    if not _connect_milvus():
        return False

    try:
        from pymilvus import Collection
        collection = Collection(COLLECTION_NAME)
        collection.delete(f"document_id == {document_id}")
        collection.flush()
        logger.info(f"Milvus 删除文档 {document_id} 的所有向量")
        return True
    except Exception as e:
        logger.error(f"Milvus 删除失败: {e}")
        return False


def sync_from_postgres(db_session) -> int:
    """
    从 PostgreSQL 同步所有已有 embedding 到 Milvus。
    用于首次迁移或数据修复。
    
    :param db_session: SQLAlchemy Session
    :return: 同步的条数
    """
    if not _connect_milvus():
        return 0

    try:
        from models.knowledge import KnowledgeChunk
        init_collection()

        chunks = db_session.query(KnowledgeChunk).filter(
            KnowledgeChunk.embedding.isnot(None)
        ).all()

        if not chunks:
            logger.info("PostgreSQL 中无数据需要同步到 Milvus")
            return 0

        # 分批同步（每批 100 条）
        batch_size = 100
        total_synced = 0

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            ids = [c.id for c in batch]
            doc_ids = [c.document_id for c in batch]
            embeddings = [c.embedding for c in batch]

            # 验证 embedding 维度
            valid_ids, valid_doc_ids, valid_embeddings = [], [], []
            for cid, did, emb in zip(ids, doc_ids, embeddings):
                if isinstance(emb, list) and len(emb) == EMBEDDING_DIM:
                    valid_ids.append(cid)
                    valid_doc_ids.append(did)
                    valid_embeddings.append(emb)

            if valid_ids:
                insert_vectors(valid_ids, valid_doc_ids, valid_embeddings)
                total_synced += len(valid_ids)

        logger.info(f"PostgreSQL → Milvus 同步完成: {total_synced} 条向量")
        return total_synced
    except Exception as e:
        logger.error(f"同步失败: {e}")
        return 0


def is_available() -> bool:
    """检查 Milvus 是否可用"""
    return _connect_milvus()
