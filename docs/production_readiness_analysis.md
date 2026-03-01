# PracticeAI 生产就绪性分析报告

> **分析日期**：2026-03-01  
> **项目目录**：`practiceAI/backend` + `practiceAI/frontend`  
> **评估结论**：❌ 当前版本**不适合直接交付生产**，存在多个 P0~P1 级别阻塞问题

---

## 🔴 P0 — 必须修复（阻塞上线）

### 1. 全局认证绕过 ——「最严重问题」

**文件**：`router/knowledge_rt.py`、`chat_rt.py`、`practice_rt.py`、`question_rt.py`、`history_rt.py`、`settings_rt.py`

```python
# 每个路由文件顶部都有这一行
TEST_USER_ID = 1   # 临时硬编码 user_id，跳过 JWT 认证（测试用）
```

**问题**：
- 6 个路由模块（含知识库管理、练习、聊天、历史、管理后台）**全部跳过了 JWT 认证**。
- 所有未认证请求都会以 `user_id=1`（admin）的身份执行，任何人都能对数据做增删改查。
- 管理员后台接口（`/api/admin/...`）没有任何权限校验，普通学生也可访问。

**修复方向**：
1. 在路由函数参数中添加 `credentials = Depends(access_security)` 解析当前用户。
2. 从 JWT payload 中提取真实 `user_id` 和 `role`。
3. 管理员路由应额外校验 `role == "admin"` 权限，否则返回 403。

---

### 2. 密钥和 API Key 硬编码在版本库中

**文件**：`app/.env`（已提交到 git）

```
DATABASE_URL=postgresql://postgres.xxxx:ZHANG2026a.@...   # 真实密码泄露
JWT_SECRET_KEY=practiceai-jwt-secret-2026-zhj             # 弱密钥 + 明文提交
LLM_API_KEY=sk-zckhudznfyogdthsrogkzmqdzycmnjeruzloslqzaynfyrci  # API Key 泄露
```

**`service/auth.py`**：
```python
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'practice_ai_secret_key') + 'happy'
```
JWT 密钥生成方式奇怪（拼接 `'happy'`），且有弱默认值兜底。

**修复方向**：
1. 立即将 `.env` 加入 `.gitignore`（已有 `.gitignore` 但未排除），并**吊销已泄露的 API Key 和数据库密码**。
2. 生产环境通过 CI/CD 环境变量或 Secrets Manager（如 AWS Secrets Manager）注入敏感配置。
3. JWT 密钥改为 `secrets.token_hex(32)` 生成的高熵随机字符串。

---

### 3. CORS 配置全开放

**文件**：`app/app_main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ❌ 允许任意来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**问题**：`allow_origins=["*"]` 与 `allow_credentials=True` 的组合在浏览器中实际上是非法配置（CORS 规范禁止），且即使生效也会允许任意站点携带凭证发送跨域请求（CSRF 风险）。

**修复方向**：将 `allow_origins` 改为前端的实际域名，如 `["https://your-domain.com"]`。

---

### 4. RAG 检索性能 —— 全表加载到内存做余弦相似度

**文件**：`service/rag.py`

```python
# 从数据库加载【所有】已嵌入的 chunk
chunks = query.all()
# Python 层面计算余弦相似度
for chunk in chunks:
    sim = cosine_similarity(question_embedding, chunk.embedding)
```

**问题**：当知识库有数千、数万个文档块时，每次用户发消息都会：
1. 将所有 embedding（JSON 格式，每条约 3KB+）全部从 PostgreSQL 拉到应用内存。
2. 在 Python 中串行计算余弦相似度（O(n) 复杂度）。

这在生产负载下会导致严重的内存占用和响应延迟，根本无法支撑并发。

**修复方向**：
- 引入 `pgvector` 扩展，将 embedding 存为向量类型，利用数据库层面的近邻搜索（`<=>` 运算符 + ivfflat/HNSW 索引）。
- 或引入专用向量数据库（Milvus、Qdrant、Weaviate）。

---

## 🟠 P1 — 重要问题（上线前强烈建议修复）

### 5. 文件上传没有大小限制和路径安全检查

**文件**：`router/knowledge_rt.py`

```python
file_content = await file.read()   # 无大小限制，可能耗尽内存
...
safe_filename = f"{file.filename}" # 文件名没有净化，存在路径穿越风险
file_path = os.path.join(UPLOAD_DIR, safe_filename)
```

**问题**：
- 攻击者可上传超大文件耗尽服务器内存（DoS）。
- 文件名如 `../../etc/passwd` 虽然 `os.path.join` 会处理，但仍应主动净化文件名（去除 `/`、`..` 等特殊字符）。
- 上传文件直接以原始文件名存储，同名文件用序号区分，但多用户场景下不同用户文件会存在同一目录，存在信息泄露风险。

**修复方向**：
1. 增加文件大小上限（如 50MB），在读取前检查 `Content-Length` 头。
2. 上传文件以 UUID 命名存储，不使用原始文件名作为磁盘路径。
3. 多用户环境下按用户分子目录存储。

---

### 6. 后台任务在 FastAPI BackgroundTasks 中执行同步阻塞操作

**文件**：`knowledge_rt.py`、`question_rt.py`

```python
background_tasks.add_task(
    _process_document_background,   # 同步函数，含 HTTP 调用和数据库 I/O
    ...
)
```

`FastAPI BackgroundTasks` 在同一个事件循环线程中运行同步任务时会阻塞整个服务。`batch_generate_embeddings` 会发起同步 HTTP 请求（调用 SiliconFlow API），可能需要数分钟，这段时间内服务器会无法响应其他请求。

**修复方向**：
- 改用 `asyncio.to_thread()` 将同步任务推送到线程池，或
- 引入 Celery + Redis 任务队列（Docker Compose 中已有 Redis，已具备条件）将文档解析、Embedding 生成异步化。

---

### 7. 数据库会话管理不一致

**文件**：`service/auth.py`、`chat_rt.py`

```python
# auth.py：手动调 next(get_db()) 而非 Depends 注入
db = next(get_db())
...
finally:
    db.close()

# chat_rt.py：在 SSE 生成器中手动新建 SessionLocal()
save_db = SessionLocal()
```

**问题**：
- 手动管理 session 容易遗漏 `.close()`，导致数据库连接泄露。
- 不同地方混用 `Depends(get_db)`、`next(get_db())`、`SessionLocal()` 三种方式，维护性差。
- `chat_rt.py` 中 SSE 流处理函数使用独立 session 保存助手消息，但 session 的生命周期不受 FastAPI 管理。

---

### 8. 注册接口无限频率限制 / 无验证码

**文件**：`router/user_rt.py`

注册和登录接口完全开放，无任何频率限制，攻击者可以：
- 暴力枚举密码（brute force）。
- 批量注册垃圾账号。

项目虽然引入了 Redis，但未使用它做限流。

**修复方向**：
- 使用 Redis 实现 IP 级别的滑动窗口限流（如：每 IP 每分钟最多 10 次登录尝试）。
- 多次失败后锁定账户或要求验证码。

---

### 9. 用户密码哈希的盐长度问题

**文件**：`utils/password.py`

```python
bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
```

`bcrypt.gensalt()` 默认 rounds=12，可接受。但 `password_hash` 字段长度只有 `VARCHAR(100)`，而 bcrypt 哈希长度固定为 60 个字符，目前刚好，但如果未来升级哈希算法可能不够用，建议改为 `VARCHAR(255)`。

---

### 10. 生产 Docker Compose 仍使用 --reload 模式

**文件**：`backend/docker-compose.yml`

```yaml
command: ["uvicorn", "app_main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

`--reload` 是开发模式，会监听文件变更并重启，**不应在生产环境使用**。它：
- 性能差，有额外的文件监听开销。
- 不稳定，任何文件变动都会触发重启，导致正在处理的请求中断。

此外，生产环境应该使用多 worker 模式（如 `--workers 4`）来充分利用多核。

---

## 🟡 P2 — 中等问题（上线后近期修复）

### 11. 管理后台无权限分离

`/api/admin/...` 前缀的接口（知识库管理、题目管理、系统设置、仪表盘）与学生接口混在一起，缺少独立的权限中间件。一旦 Problem 1（认证绕过）修复后，还需要额外增加 admin 角色校验。

### 12. Embedding 存储效率低

`KnowledgeChunk.embedding` 字段类型为 `JSON`，以 JSON 数组形式存储浮点向量（bge-m3 输出 1024 维），每个向量约 6-8KB。相比向量专用类型（`pgvector` 的 `VECTOR` 类型），存储空间多 3-4 倍，且无法使用索引查询。

### 13. 日志中可能泄露敏感信息

**文件**：`utils/database.py`

```python
print(f"👉 [DEBUG] 当前使用的 DATABASE_URL (已脱敏): {masked_url}")
```

这类 `print` 调试语句在生产中会打印到标准输出，若日志被收集分析，脱敏处理失效时有泄露数据库连接信息的风险。应统一使用结构化 logger 并在生产环境设置 `LOG_LEVEL=WARNING`。

### 14. 历史记录详情中存在 N+1 查询

**文件**：`router/history_rt.py`

```python
for a in answers:
    question = db.query(Question).filter(Question.id == a.question_id).first()
```

每一条答题记录都单独发一次 SQL 查询，答题数量为 N 时会产生 N+1 次查询。应使用 `JOIN` 或 SQLAlchemy 的 `joinedload` 批量加载。

### 15. 前端没有环境变量化 API 地址

**文件**：`frontend/.env.production` 内容为 `VITE_API_BASE=`（空值）

前端请求的 API 地址（实际代码中可能写的是 `localhost:8000`）在生产环境中需要替换为真实服务地址。需检查前端 API 封装层是否使用 `import.meta.env.VITE_API_BASE`。

---

## 🔵 P3 — 优化建议（持续改进）

### 16. requirements.txt 依赖版本管理混乱

```
psycopg2-binary      # 无版本锁定
bcrypt               # 无版本锁定
python-jose          # 无版本锁定
openai               # 无版本锁定
dashscope            # 无版本锁定（且实际已改用 SiliconFlow，此包多余）
```

未锁定版本的依赖在 CI/CD 中随时可能拉取到破坏性更新，应使用 `pip freeze > requirements.txt` 锁定精确版本，或改用 Poetry / uv 管理依赖。

### 17. 没有健康检查接口

Docker Compose 中没有 `healthcheck` 配置，容器管理平台无法探测服务状态，服务崩溃后不会自动重启或触发告警。

### 18. 推荐问题是静态硬编码的

**文件**：`router/chat_rt.py`

```python
suggested = ["这个概念还有哪些应用场景？", "能再详细解释一下吗？", "有没有相关的练习题？"]
```

"推荐问题" 功能每次固定返回同样的三个问题，对用户没有实际参考价值，建议使用 LLM 根据对话内容动态生成，或删除该功能。

### 19. 缺少 API 访问日志和链路追踪

生产环境需要记录每个请求的响应时间、状态码、用户 ID，以便排查问题和做监控告警。建议添加 FastAPI 中间件统一记录访问日志，并考虑集成 OpenTelemetry。

### 20. 前端缺少 TypeScript 严格模式

`package.json` 中没有独立的 `tsconfig.json` 片段可供检查，但前端依赖链中 `react-hook-form`、`react-router` 等使用了 `peerDependencies`，`react` 标记为 optional，这在部分打包场景下可能引发运行时错误。

---

## 📊 问题汇总

| 优先级 | 问题数 | 代表性问题                                         |
| ------ | ------ | -------------------------------------------------- |
| 🔴 P0   | 4      | 认证绕过、密钥泄露、CORS 全开、RAG 性能            |
| 🟠 P1   | 6      | 文件上传安全、后台任务阻塞、Session 管理、限流缺失 |
| 🟡 P2   | 5      | 权限分离、Embedding 存储、日志泄露、N+1 查询       |
| 🔵 P3   | 4      | 依赖版本、健康检查、推荐问题、监控告警             |

---

## 🛣️ 推荐修复路径

```
第一周（解锁上线门槛）
  ├── 修复 P0#1：为所有路由补充 JWT 认证 + 角色权限校验
  ├── 修复 P0#2：吊销泄露密钥，.env 不进版本库
  ├── 修复 P0#3：CORS 限定为生产域名
  └── 修复 P1#10：Docker 生产配置去掉 --reload

第二周（安全加固）
  ├── 修复 P1#5：文件上传大小限制 + UUID 命名
  ├── 修复 P1#7：统一数据库 Session 管理模式
  └── 修复 P1#8：登录限流（利用现有 Redis）

第三周（性能与稳定性）
  ├── 修复 P0#4：引入 pgvector 替换内存余弦相似度
  ├── 修复 P1#6：文档处理改用 Celery 异步队列
  └── 修复 P2#14：历史记录 N+1 查询优化

持续改进
  ├── 依赖版本锁定 (P3#16)
  ├── 健康检查接口 (P3#17)
  └── 监控 / 链路追踪 (P3#19)
```
