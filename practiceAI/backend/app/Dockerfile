FROM python:3.11.7-slim

# 安装构建工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*

# 配置 pip

RUN pip install --upgrade pip setuptools wheel

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝代码
COPY . /app

# 修改权限
RUN chmod -R 755 /app

# 启动命令
CMD ["uvicorn", "app_main:app", "--host", "0.0.0.0", "--port", "8000"]
