# practiceAI 后端并发测试指南

## 一、为什么要做并发测试？

practiceAI 后端是 FastAPI 异步应用，存在以下并发敏感点：

| 风险点               | 说明                                                                            |
| -------------------- | ------------------------------------------------------------------------------- |
| **数据库连接池耗尽** | SQLAlchemy 默认连接池有限，高并发下会排队或报错                                 |
| **后台任务积压**     | `BackgroundTasks` 调用 LLM/Embedding 时耗时长，若并发上传文档会产生大量后台任务 |
| **SSE 流式连接**     | 智能问答使用 Server-Sent Events，多路并发会持续占用连接                         |
| **写冲突**           | 并发创建题目/会话时，数据库同一时刻多写，需要验证隔离是否正确                   |
| **LLM 限流**         | `chat_block` / `chat_stream` 并发调用大模型 API，可能触发速率限制（HTTP 429）   |

---

## 二、本项目提供的并发测试脚本

脚本路径：`practiceAI/backend/test_concurrent.py`

### 2.1 依赖

```bash
# httpx 已在 requirements.txt 中，虚拟环境激活后无需额外安装
source .venv/bin/activate
```

### 2.2 运行方式

```bash
cd practiceAI/backend

# 默认：10 并发用户，执行 3 轮
python test_concurrent.py

# 自定义参数
python test_concurrent.py --url http://127.0.0.1:8001 --concurrency 20 --rounds 5
```

| 参数            | 说明           | 默认值                  |
| --------------- | -------------- | ----------------------- |
| `--url`         | 后端地址       | `http://127.0.0.1:8001` |
| `--concurrency` | 并发虚拟用户数 | `10`                    |
| `--rounds`      | 重复轮次       | `3`                     |

### 2.3 测试场景说明

脚本使用 `asyncio + httpx.AsyncClient` 模拟并发用户，每位用户在一轮内依次执行以下 8 个场景：

| 场景           | 被测接口                                       | 类型  |
| -------------- | ---------------------------------------------- | ----- |
| 登录鉴权       | `POST /api/auth/login`                         | 读    |
| 知识库查询     | `GET /api/admin/knowledge/documents` + `stats` | 读    |
| 聊天会话       | `POST /api/chat/sessions` + 列表               | 写+读 |
| 练习列表       | `GET /api/practice/knowledge-bases`            | 读    |
| 题目 CRUD      | `POST /api/admin/questions/` + 列表            | 写+读 |
| 系统配置       | `GET/PUT /api/admin/settings/`                 | 读写  |
| 历史记录       | `GET /api/history/practice,chat,stats`         | 读    |
| 管理 Dashboard | `GET /api/admin/dashboard/*`                   | 读    |

### 2.4 输出报告示例

```
===================================================================
  并发测试报告  (并发用户: 10  轮次: 3)
===================================================================
API 名称                        总数  成功率    最小ms   平均ms    P95ms   最大ms
-------------------------------------------------------------------
✅ Chat-会话列表                  30  100.0%        12       35      120      340
✅ Chat-创建会话                  30  100.0%        15       42      155      400
❌ Questions-创建题目             30   93.3%        20       88      280      520
     └─ 错误: 超时: ...
✅ Settings-读取                  30  100.0%         8       18       55      110
===================================================================
  总请求: 390   成功: 385   失败: 5   总成功率: 98.7%
===================================================================
```

**关键指标解读：**
- **成功率** < 100% → 存在 5xx 错误或超时，需排查
- **P95ms（95 百分位延迟）** → 代表绝大多数用户感受到的最慢延迟
- **最大ms 远大于平均ms** → 说明存在"长尾请求"，通常是数据库锁等待或 LLM 限流

---

## 三、使用 Locust 做更专业的压测（可选）

[Locust](https://locust.io) 提供实时 Web UI 和更完整的压测统计。

### 3.1 安装

```bash
pip install locust
```

### 3.2 创建 Locustfile

在 `practiceAI/backend/` 下创建 `locustfile.py`：

```python
from locust import HttpUser, task, between

class PracticeAIUser(HttpUser):
    wait_time = between(0.5, 2)   # 每次任务间隔 0.5~2 秒
    token = None

    def on_start(self):
        resp = self.client.post("/api/auth/login",
                                json={"username": "admin", "password": "admin123"})
        self.token = resp.json().get("access_token", "")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def list_knowledge(self):
        self.client.get("/api/admin/knowledge/documents", headers=self.headers)

    @task(2)
    def knowledge_stats(self):
        self.client.get("/api/admin/knowledge/stats", headers=self.headers)

    @task(2)
    def list_questions(self):
        self.client.get("/api/admin/questions/", headers=self.headers)

    @task(1)
    def create_chat_session(self):
        self.client.post("/api/chat/sessions", headers=self.headers)

    @task(1)
    def dashboard_stats(self):
        self.client.get("/api/admin/dashboard/stats", headers=self.headers)
```

### 3.3 运行

```bash
# 启动 Locust Web UI（访问 http://localhost:8089）
locust -f locustfile.py --host=http://127.0.0.1:8001

# 无头模式（CI 友好）：50 用户，5 秒 spawn，运行 60 秒
locust -f locustfile.py --host=http://127.0.0.1:8001 \
       --headless -u 50 -r 5 --run-time 60s
```

---

## 四、常见瓶颈与优化建议

### 4.1 数据库连接池不足

**现象**：`QueuePool limit overflow` 或 `TimeoutError` 错误

**修复**：在 `utils/database.py` 调整连接池参数：

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,          # 核心连接数（默认 5）
    max_overflow=40,       # 超出后最多再开多少临时连接
    pool_timeout=30,       # 超时放弃（秒）
    pool_pre_ping=True,    # 防止僵尸连接
)
```

### 4.2 LLM 接口限流（429）

**现象**：题目创建 / 练习接口出现 500，日志含 `rate limit`

**修复**：在 `service/llm.py` 加指数退避重试：

```python
import time

def chat_block(messages, system_prompt="", max_retries=3):
    for attempt in range(max_retries):
        try:
            return _do_call(messages, system_prompt)
        except RateLimitError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise
```

### 4.3 后台任务雪崩（文档上传并发）

**现象**：并发上传多个文档后，CPU/内存飙升

**修复**：用 `asyncio.Semaphore` 限制并发 Embedding 任务数：

```python
EMBEDDING_SEM = asyncio.Semaphore(3)  # 最多同时处理 3 个文档

async def _process_with_limit(*args):
    async with EMBEDDING_SEM:
        await asyncio.to_thread(_process_document_background, *args)
```

---

## 五、推荐测试步骤

```bash
# 1. 确保后端已启动
cd practiceAI/backend && bash start.sh

# 2. 运行顺序冒烟测试（先验证接口正常）
python test_api.py

# 3. 小并发基准测试
python test_concurrent.py --concurrency 10 --rounds 3

# 4. 逐步加压
python test_concurrent.py --concurrency 20 --rounds 5
python test_concurrent.py --concurrency 50 --rounds 3

# 5. 观察后台日志
docker compose logs -f backend
```

> [!TIP]
> 测试时可查看 PostgreSQL 活跃连接数：`SELECT count(*) FROM pg_stat_activity;`

> [!WARNING]
> 并发测试会写入大量测试数据（题目、会话等），建议测试结束后手动清理或使用独立测试数据库。
