from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.base import Base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:pg123456@localhost:5433/practice_ai")

# [调试] 打印脱敏后的 DATABASE_URL 地址以排查问题
from urllib.parse import urlparse
try:
    parsed_url = urlparse(DATABASE_URL)
    # 将密码替换为 *** 显示，避免泄露
    masked_netloc = parsed_url.netloc.replace(parsed_url.password, "***") if parsed_url.password else parsed_url.netloc
    masked_url = parsed_url._replace(netloc=masked_netloc).geturl()
    print(f"👉 [DEBUG] 当前使用的 DATABASE_URL (已脱敏): {masked_url}")
except Exception as e:
    print(f"👉 [DEBUG] 无法解析 DATABASE_URL: {e}")

from sqlalchemy.pool import NullPool

# 对于线上 Supabase 等数据库，必须要求 ssl 模式才能防止连接被强行切断
# 另外对于 Supabase 的连接池 (6543 端口)，需要增加选项以避免 "server didn't return client encoding" 报错
connect_args = {}
if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args["sslmode"] = "require"
    if "pooler.supabase.com" in DATABASE_URL or "6543" in DATABASE_URL:
        # Supabase Pooler 经常抛出未返回编码的问题，强制要求它
        connect_args["options"] = "-c client_encoding=utf8"

# 针对 Pooler 强烈建议禁用 SQLAlchemy 自身的连接池 (NullPool)，否则由于 Supabase 代理端超时杀连接或网络波动
# 极易导致 "SSL connection has been closed unexpectedly" 报错
engine_kwargs = {
    "connect_args": connect_args
}

if "pooler.supabase.com" in DATABASE_URL:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)
