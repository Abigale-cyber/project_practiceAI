FROM python:3.11.7-slim

# 安装构建工具和 curl（用于 healthcheck）
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential python3-dev curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

# 设置工作目录
WORKDIR /app

# 先拷贝依赖文件，利用 Docker 缓存层
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝代码
COPY . /app

# 创建上传目录
RUN mkdir -p /app/uploads && chmod -R 755 /app

# 非 root 用户运行（安全加固）
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# 启动命令（生产模式，多 worker）
CMD ["uvicorn", "app_main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
