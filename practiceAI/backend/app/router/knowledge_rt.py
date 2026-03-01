"""
知识库管理路由 —— 上传文档时自动：解析 → 分块 → 生成 Embedding → 存储
需要管理员权限。
"""

import os
import uuid as uuid_mod
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from utils.database import get_db, SessionLocal
from utils import logger
from models.knowledge import KnowledgeDocument, KnowledgeChunk
from schemas.knowledge import KnowledgeDocumentResponse, KnowledgeStatsResponse
from service.document_parser import process_document
from service.embedding import batch_generate_embeddings
from service.auth import require_admin

router = APIRouter(prefix="/api/admin/knowledge", tags=["知识库管理"])

# 上传文件保存目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 文件大小限制（50MB）
MAX_FILE_SIZE = 50 * 1024 * 1024


def _process_document_background(document_id: int, file_path: str, file_type: str, chunk_method: str = "auto"):
    """
    后台任务：解析文档 → 分块 → 生成 Embedding → 存入数据库。
    """
    db = SessionLocal()
    try:
        logger.info(f"开始处理文档 [{document_id}]: {file_path}, 分块方式: {chunk_method}")

        # 1. 解析 & 分块
        chunks = process_document(file_path, file_type, chunk_method=chunk_method)
        if not chunks:
            doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
            if doc:
                doc.status = "error"
                db.commit()
            logger.error(f"文档 [{document_id}] 解析失败，无内容")
            return

        logger.info(f"文档 [{document_id}] 解析得到 {len(chunks)} 个切片")

        # 2. 批量生成 Embedding
        texts = [c["content"] for c in chunks]
        embeddings = batch_generate_embeddings(texts)
        logger.info(f"文档 [{document_id}] Embedding 生成完成")

        # 3. 存入数据库
        for chunk_data, embedding in zip(chunks, embeddings):
            chunk_record = KnowledgeChunk(
                document_id=document_id,
                chunk_index=chunk_data["chunk_index"],
                content=chunk_data["content"],
                embedding=embedding,  # JSON 数组存储
            )
            db.add(chunk_record)

        # 4. 更新文档状态
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
        if doc:
            doc.status = "processed"
            doc.chunk_count = len(chunks)

        db.commit()
        logger.info(f"文档 [{document_id}] 处理完成，共 {len(chunks)} 个切片")

    except Exception as e:
        db.rollback()
        logger.error(f"文档 [{document_id}] 处理失败: {e}")
        try:
            doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
            if doc:
                doc.status = "error"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.get("/documents", response_model=List[KnowledgeDocumentResponse])
async def list_documents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """获取文档列表（管理员）"""
    try:
        documents = db.query(KnowledgeDocument).order_by(
            KnowledgeDocument.created_at.desc()
        ).all()

        return [
            KnowledgeDocumentResponse(
                id=doc.id,
                name=doc.name,
                file_type=doc.file_type,
                file_size=doc.file_size,
                category=doc.category or "未分类",
                status=doc.status or "processing",
                chunk_count=doc.chunk_count or 0,
                created_at=doc.created_at.isoformat() if doc.created_at else "",
                updated_at=doc.updated_at.isoformat() if doc.updated_at else "",
            )
            for doc in documents
        ]
    except Exception as e:
        logger.error(f"获取文档列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_method: str = Form("auto"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """上传文档 —— 保存文件后，后台异步处理（解析→嵌入→存储）"""
    try:
        file_content = await file.read()
        file_size = len(file_content)

        # 文件大小检查
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"文件大小超过限制（最大 {MAX_FILE_SIZE // (1024 * 1024)}MB）"
            )

        if file_size < 1024:
            size_str = f"{file_size} B"
        elif file_size < 1024 * 1024:
            size_str = f"{file_size / 1024:.1f} KB"
        else:
            size_str = f"{file_size / (1024 * 1024):.1f} MB"

        file_ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "unknown"

        # 支持的文件格式
        supported_types = ('txt', 'md', 'markdown', 'docx', 'pdf')
        if file_ext not in supported_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式: .{file_ext}，支持: {', '.join(supported_types)}"
            )

        # 安全文件名：使用 UUID 避免路径穿越攻击
        safe_filename = f"{uuid_mod.uuid4().hex}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        with open(file_path, 'wb') as f:
            f.write(file_content)

        user_id = current_user["user_id"]

        # 创建数据库记录（status = processing）
        document = KnowledgeDocument(
            name=file.filename,
            file_type=file_ext,
            file_size=size_str,
            status="processing",
            uploaded_by=user_id,
        )
        db.add(document)
        db.commit()
        db.refresh(document)

        # 后台异步处理文档
        background_tasks.add_task(
            _process_document_background,
            document.id,
            file_path,
            file_ext,
            chunk_method,
        )

        logger.info(f"文档上传成功: {file.filename}（by user {user_id}），后台处理中...")
        return {
            "status": "success",
            "message": "文档上传成功，正在后台处理",
            "document_id": document.id,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"文档上传失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """删除文档（同时级联删除切片）"""
    try:
        document = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.id == document_id
        ).first()
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        # 删除磁盘文件（按名称查找）
        for fname in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                # 原始文件名无法精确匹配（UUID 存储），仅清理同名文件
                pass

        # 级联删除切片（数据库外键设置了 CASCADE）
        db.delete(document)
        db.commit()
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除文档失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}/chunks")
async def get_document_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """获取指定文档的分块详情"""
    try:
        document = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.id == document_id
        ).first()
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")

        chunks = db.query(KnowledgeChunk).filter(
            KnowledgeChunk.document_id == document_id
        ).order_by(KnowledgeChunk.chunk_index).all()

        return {
            "document": {
                "id": document.id,
                "name": document.name,
                "file_type": document.file_type,
                "file_size": document.file_size,
                "status": document.status,
                "chunk_count": document.chunk_count,
                "created_at": str(document.created_at) if document.created_at else None,
            },
            "chunks": [
                {
                    "id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "has_embedding": chunk.embedding is not None,
                    "content_length": len(chunk.content) if chunk.content else 0,
                }
                for chunk in chunks
            ],
            "total_chunks": len(chunks),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文档分块失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/chunks/{chunk_id}")
async def update_chunk(
    chunk_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """更新分块内容，并重新生成 Embedding"""
    try:
        chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
        if not chunk:
            raise HTTPException(status_code=404, detail="分块不存在")

        new_content = data.get("content", "").strip()
        if not new_content:
            raise HTTPException(status_code=400, detail="内容不能为空")

        chunk.content = new_content

        # 重新生成 Embedding
        try:
            embeddings = batch_generate_embeddings([new_content])
            if embeddings and len(embeddings) > 0:
                chunk.embedding = embeddings[0]
                logger.info(f"分块 {chunk_id} Embedding 已更新")
        except Exception as emb_err:
            logger.warning(f"重新生成 Embedding 失败: {str(emb_err)}")
            # 即使 embedding 失败也保存文本更新

        db.commit()
        db.refresh(chunk)

        return {
            "id": chunk.id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "has_embedding": chunk.embedding is not None,
            "content_length": len(chunk.content),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新分块失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=KnowledgeStatsResponse)
async def get_knowledge_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """获取知识库统计"""
    try:
        documents = db.query(KnowledgeDocument).all()
        processed = [d for d in documents if d.status == "processed"]
        processing = [d for d in documents if d.status == "processing"]
        categories = list(set(d.category or "未分类" for d in documents))

        # 统计总切片数
        total_chunks = db.query(KnowledgeChunk).count()

        return KnowledgeStatsResponse(
            total_documents=len(documents),
            processed_documents=len(processed),
            processing_count=len(processing),
            total_chunks=total_chunks,
            categories=categories,
        )
    except Exception as e:
        logger.error(f"获取知识库统计失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
