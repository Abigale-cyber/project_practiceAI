from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from router import user_rt
from router import question_rt
from router import settings_rt
from router import knowledge_rt
from router import practice_rt
from router import chat_rt
from router import history_rt
from router import admin_rt
import os

# 从环境变量获取 root_path
root_path = os.getenv("ROOT_PATH", "")

app = FastAPI(
    title="PracticeAI API",
    description="AI 陪练助手后端接口",
    version="1.0.0",
    root_path=root_path,
)


@app.get("/", include_in_schema=False)
def root():
    """根路径：重定向到 API 文档"""
    return RedirectResponse(url="/docs", status_code=302)


# CORS 中间件 —— 通过环境变量 CORS_ORIGINS 配置允许的前端域名
# 多个域名用逗号分隔，如: CORS_ORIGINS=http://localhost:5173,https://example.com
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 启动时自动初始化数据库表
from utils.database import init_db

@app.on_event("startup")
def on_startup():
    """应用启动时初始化数据库表"""
    init_db()


# 健康检查接口
@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查（供 Docker / 负载均衡器使用）"""
    return {"status": "ok"}


# 注册路由
app.include_router(user_rt.router)
app.include_router(question_rt.router)
app.include_router(settings_rt.router)
app.include_router(knowledge_rt.router)
app.include_router(practice_rt.router)
app.include_router(chat_rt.router)
app.include_router(history_rt.router)
app.include_router(admin_rt.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
