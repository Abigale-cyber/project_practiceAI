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


# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
