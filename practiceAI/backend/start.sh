#!/bin/bash
# 后端启动脚本 - 确保可靠启动

cd "$(dirname "$0")"

# 1. 杀掉已有的8000端口进程
echo "🔄 检查端口 8000..."
PID=$(lsof -ti :8000 2>/dev/null)
if [ -n "$PID" ]; then
    echo "⏹  关闭旧进程 (PID: $PID)..."
    kill -9 $PID 2>/dev/null
    sleep 1
fi

# 2. 激活虚拟环境
source .venv/bin/activate

# 3. 切换到 app 目录
cd app

# 4. 启动 uvicorn（后台运行，日志输出到文件）
LOG_FILE="/tmp/practiceai_backend.log"
echo "🚀 启动后端服务..."
nohup python -m uvicorn app_main:app --reload --host 127.0.0.1 --port 8000 > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!

# 5. 等待启动完成
sleep 2

# 6. 检查是否成功
if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
    echo "✅ 后端已启动 (PID: $BACKEND_PID)"
    echo "   地址: http://127.0.0.1:8000"
    echo "   文档: http://127.0.0.1:8000/docs"
    echo "   日志: $LOG_FILE"
else
    echo "❌ 启动失败，查看日志:"
    tail -20 "$LOG_FILE"
    exit 1
fi
