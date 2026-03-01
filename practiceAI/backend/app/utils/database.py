from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.base import Base
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger("practiceAI")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://practiceai:practiceai_pass@localhost:5433/practice_ai")

# ============ 连接参数配置 ============
connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "pool_size": 5,
    "max_overflow": 10,
}

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库表（如果表不存在则创建）"""
    logger.info("正在检查并初始化数据库表...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表初始化完成")
    except Exception as e:
        logger.error(f"数据库表初始化失败: {e}")
