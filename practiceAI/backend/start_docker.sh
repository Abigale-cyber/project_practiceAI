#!/bin/bash

# 发生错误时停止执行
set -e

# 确保在脚本所在目录(backend)执行
cd "$(dirname "$0")"

echo "======================================"
echo "    练习平台 Docker 环境检查与启动    "
echo "======================================"
echo "🔍 开始进行环境与配置检查..."

# 1. 检查是否安装了 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker 及其命令行工具！"
    echo "👉 请先安装并启动 Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# 2. 检查 Docker 守护进程是否在运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误: 无法连接到 Docker 服务！"
    echo "👉 请确保 Docker 后台应用已正常启动运行（检查顶部菜单栏的 Docker 图标）。"
    exit 1
fi

# 3. 检查环境变量文件 .env 存不存在
if [ ! -f ".env" ]; then
    echo "⚠️ 未找到 .env 配置文件！系统正在自动从 .env.example 复制基础结构..."
    cp .env.example .env
    echo "❌ 错误: 请打开当前的 backend/.env 文件，填写必要的大模型配置后再次运行此脚本！"
    exit 1
fi

# 4. 解析并验证 .env 中的关键配置参数
# 获取大模型 API_KEY (移除等号两边的引号、单引号和空格)
API_KEY=$(grep "^LLM_API_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')

if [ -z "$API_KEY" ] || [ "$API_KEY" = "your-api-key-here" ]; then
    echo "❌ 错误: 测试未通过！检测到 LLM_API_KEY 为空或是默认占位符。"
    echo "👉 因为系统 AI 出题依赖大模型，请在 backend/.env 文件中填入有效的大模型 API Key！"
    exit 1
fi

# 校验 JWT 安全密钥
JWT_KEY=$(grep "^JWT_SECRET_KEY=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
if [ -z "$JWT_KEY" ] || [ "$JWT_KEY" = "change-me-to-a-strong-random-key" ]; then
    echo "⚠️ 警告: 您当前使用的 JWT_SECRET_KEY 为默认字符串，这在生产环境极不安全！"
    echo "建议后续前往 backend/.env 中修改为复杂的随机字符串。本次继续执行..."
    sleep 3
fi

# 5. 检查端口占用情况 (防止与本地手动的 uvicorn 进程产生冲突)
API_PORT=$(grep "^API_PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "8000")
# 如果该端口处于监听状态，并且并不是被 docker-proxy 占用的
if lsof -Pi :"$API_PORT" -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    # 尝试判断是否已经是当前的容器在占用
    if ! docker ps --format '{{.Names}}' | grep -q "practice_api"; then
        echo "❌ 错误: API 端口 $API_PORT 已被物理机的其他进程(可能是您手动跑的后端)占用！"
        echo "👉 请先停止当前运行的后端服务服务进程，再运行 Docker 一键启动脚本。"
        echo "如果不想停止当前服务，可以前往 backend/.env 中更改 API_PORT 映射值为其他端口（如 8080）。"
        exit 1
    fi
fi

echo "======================================"
echo "✅ 所有环境与配置检查通过！准备启动服务..."
echo "======================================"

# 6. 使用 Docker Compose 构建并启动
# 兼容新版本 (docker compose) 和老版本 (docker-compose)
if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo ""
echo "🎉 恭喜！平台微服务组启动指令已成功下达。"
echo "📝 提示:"
echo "1. 使用 'docker compose ps' 查看服务运行状态。"
echo "2. 使用 'docker compose logs -f practice_api' 实时关注 API 后端控制台日志（ctrl+c退出）。"
echo "3. 如果模型调用失败，请随时编辑当前目录的 .env 文件然后再次运行此脚本更新。"
