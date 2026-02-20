from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from models.base import Base
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:pg123456@localhost:5433/practice_ai")

# [调试] 打印脱敏后的 DATABASE_URL 地址以排查问题
try:
    parsed_url = urlparse(DATABASE_URL)
    masked_netloc = parsed_url.netloc.replace(parsed_url.password, "***") if parsed_url.password else parsed_url.netloc
    masked_url = parsed_url._replace(netloc=masked_netloc).geturl()
    print(f"👉 [DEBUG] 当前使用的 DATABASE_URL (已脱敏): {masked_url}")
except Exception as e:
    print(f"👉 [DEBUG] 无法解析 DATABASE_URL: {e}")

# ============ 连接参数配置 ============
connect_args = {}
engine_kwargs = {}

if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args["sslmode"] = "require"

    # TCP Keepalive: 防止 AWS 负载均衡器 / 防火墙因空闲而切断连接
    connect_args["keepalives"] = 1
    connect_args["keepalives_idle"] = 30
    connect_args["keepalives_interval"] = 10
    connect_args["keepalives_count"] = 5

    if "6543" in DATABASE_URL:
        # ---- Supabase Transaction Mode Pooler (端口6543) ----
        # 必须用 NullPool 禁止 SQLAlchemy 自身的连接池
        # 必须指定 client_encoding 否则报 "server didn't return client encoding"
        connect_args["options"] = "-c client_encoding=utf8"
        engine_kwargs["poolclass"] = NullPool
        print("👉 [DEBUG] 检测到 6543 端口 (Transaction Pooler), 使用 NullPool")
    else:
        # ---- 直连 或 Session Mode Pooler (端口5432) ----
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 300
        engine_kwargs["pool_size"] = 5
        engine_kwargs["max_overflow"] = 10
        print("👉 [DEBUG] 检测到 5432 端口 (直连/Session Pooler), 使用标准连接池")
else:
    # 本地开发环境
    engine_kwargs["pool_pre_ping"] = True

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
    print("👉 [DEBUG] 正在检查并初始化数据库表...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ [DEBUG] 数据库表初始化完成")
    except Exception as e:
        print(f"❌ [DEBUG] 数据库表初始化失败: {e}")
