"""
Embedding 服务 —— 调用 SiliconFlow 的 BAAI/bge-m3 生成文本向量

参考 swxy/backend/app/service/core/rag/nlp/model.py 的 generate_embedding，
但使用 SiliconFlow API 和 BAAI/bge-m3 模型。
"""

from openai import OpenAI
import os
import numpy as np
from typing import List, Optional
from dotenv import load_dotenv
from utils import logger

load_dotenv()

# Embedding 配置 —— 使用 SiliconFlow 提供的 BAAI/bge-m3
EMBEDDING_API_KEY = os.getenv("LLM_API_KEY", "")
EMBEDDING_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.siliconflow.cn/v1")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")


def get_embedding_client() -> OpenAI:
    """获取 Embedding 客户端（与 LLM 共用 SiliconFlow API）"""
    return OpenAI(
        api_key=EMBEDDING_API_KEY,
        base_url=EMBEDDING_BASE_URL,
    )


def generate_embedding(text: str) -> Optional[List[float]]:
    """
    为单段文本生成向量嵌入。

    :param text: 输入文本
    :return: 向量列表，失败返回 None
    """
    try:
        client = get_embedding_client()
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            encoding_format="float",
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"生成 embedding 失败: {e}")
        return None


def batch_generate_embeddings(texts: List[str], batch_size: int = 10) -> List[Optional[List[float]]]:
    """
    批量生成向量嵌入（参考 swxy 的 batch_generate_embeddings）。

    SiliconFlow 支持批量输入，但为安全起见按 batch_size 分批。

    :param texts: 文本列表
    :param batch_size: 每批大小
    :return: 向量列表（与 texts 一一对应）
    """
    client = get_embedding_client()
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
                encoding_format="float",
            )
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)
            logger.info(f"Embedding 批次 {i // batch_size + 1}: {len(batch)} 条成功")
        except Exception as e:
            logger.error(f"Embedding 批次 {i // batch_size + 1} 失败: {e}")
            all_embeddings.extend([None] * len(batch))

    return all_embeddings


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """计算两个向量的余弦相似度"""
    a = np.array(vec_a)
    b = np.array(vec_b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
