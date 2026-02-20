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

# 对线上数据库要求 sslmode
connect_args = {}
if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args["sslmode"] = "require"
    # 如果是连接池，添加统一编码以防万一
    if "pooler.supabase.com" in DATABASE_URL or "6543" in DATABASE_URL:
        connect_args["options"] = "-c client_encoding=utf8"

    # TCP Keepalive 可以防止长连接被中间路由或防火墙(如AWS ELB)意外切断
    connect_args["keepalives"] = 1
    connect_args["keepalives_idle"] = 30
    connect_args["keepalives_interval"] = 10
    connect_args["keepalives_count"] = 5

engine_kwargs = {
    "connect_args": connect_args
}

# 如果是 Supabase Transaction Mode Pooler (6543端口)，必须用 NullPool (禁本地池)
if "6543" in DATABASE_URL:
    engine_kwargs["poolclass"] = NullPool
else:
    # 如果是直连模式(5432)，或者 Session Pooler(5432)
    # 应充分利用 SQLAlchemy 自带的池，禁止用 NullPool 防止 SSL 握手过多被远端屏蔽
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300    # 每 5 分钟回收，防止死链
    engine_kwargs["pool_size"] = 10        # 连接池大小
    engine_kwargs["max_overflow"] = 20     # 最大允许溢出连接数

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
