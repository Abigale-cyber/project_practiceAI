# PracticeAI — AI 演练工具使用手册

> **AI 陪练助手** · 基于 RAG 的智能学习平台，支持知识库问答、智能练习、成绩追踪

---

## 📋 目录

- [项目概览](#项目概览)
- [技术架构](#技术架构)
- [环境准备](#环境准备)
- [快速启动](#快速启动)
- [功能模块](#功能模块)
- [项目结构](#项目结构)
- [API 接口](#api-接口)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

---

## 项目概览

PracticeAI 是一个面向教育培训场景的 AI 智能陪练平台，核心能力包括：

- 🤖 **智能导师**：基于 RAG（检索增强生成）的知识库问答，支持长期记忆（知识库文档）和短期记忆（临时上传文件）
- 📝 **智能练习**：自动生成选择题和简答题，AI 实时批改反馈
- 📊 **成绩追踪**：练习历史、正确率统计、学习进度可视化
- 🛠️ **后台管理**：知识库管理、题库管理、系统设置

### 角色说明

| 角色            | 入口     | 功能                                   |
| --------------- | -------- | -------------------------------------- |
| **学生**        | `/`      | 学习看板、智能导师、闯关刷题、成绩回顾 |
| **教师/管理员** | `/admin` | 数据看板、知识管理、题库设置、系统配置 |

---

## 技术架构

```
┌──────────────────────────────────────────────┐
│                  前端 (React)                 │
│  Vite + React 19 + React Router + TailwindCSS │
│  端口: 5173                                   │
└────────────────────┬─────────────────────────┘
                     │ HTTP / SSE
┌────────────────────▼─────────────────────────┐
│               后端 (FastAPI)                  │
│  Python 3.x + SQLAlchemy + OpenAI SDK         │
│  端口: 8000                                   │
├───────────────────────────────────────────────┤
│  核心服务:                                    │
│  ├─ RAG 检索引擎 (向量相似度匹配)              │
│  ├─ LLM 对话 (DeepSeek-R1, SSE 流式输出)      │
│  ├─ 文档解析 (docx/pdf/md/txt)               │
│  └─ 练习引擎 (题目生成 + AI 批改)              │
└────────────────────┬─────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   PostgreSQL     Redis      SiliconFlow
   (数据存储)    (缓存/向量)   (LLM API)
```

---

## 环境准备

### 系统要求

- **Node.js** >= 18
- **Python** >= 3.10
- **PostgreSQL** (推荐使用 Supabase 或本地 Docker)
- **Redis** (本地 Docker)

### 环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cd practiceAI/backend
cp .env.example app/.env
```

编辑 `app/.env`：

```env
# 数据库连接（Supabase 或本地 PostgreSQL）
DATABASE_URL=postgresql://postgres:password@localhost:5433/practice_ai

# JWT 密钥
JWT_SECRET_KEY=your-secret-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_DB=0

# 大模型配置（SiliconFlow）
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.siliconflow.cn/v1
LLM_MODEL=deepseek-ai/DeepSeek-R1-Distill-Qwen-14B
```

### 安装依赖

```bash
# 后端
cd practiceAI/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r app/requirements.txt

# 前端
cd practiceAI/frontend
npm install
```

---

## 快速启动

### 一键启动后端

```bash
bash practiceAI/backend/start.sh
```

此脚本会自动：清理旧进程 → 激活虚拟环境 → 启动 uvicorn（热重载模式）

- 服务地址：http://127.0.0.1:8000
- API 文档：http://127.0.0.1:8000/docs
- 日志文件：`/tmp/practiceai_backend.log`

### 启动前端

```bash
cd practiceAI/frontend
npm run dev
```

- 访问地址：http://localhost:5173

### Docker 方式（可选）

```bash
cd practiceAI/backend/app
docker-compose up -d   # 启动 PostgreSQL + Redis
```

---

## 功能模块

### 🤖 智能导师（Chat）

**路径**：`/chat`

基于 RAG 的知识库问答系统，支持双重记忆机制：

| 记忆类型     | 说明                     | 引用显示             |
| ------------ | ------------------------ | -------------------- |
| **长期记忆** | 管理员上传到知识库的文档 | 📚 文档名.docx        |
| **短期记忆** | 用户临时上传的参考文件   | 📎 文件名（临时上传） |

**核心功能**：
- ✅ 流式输出（SSE），思考过程折叠展示
- ✅ 引用来源追溯，标注来自哪个文档
- ✅ 智能推荐后续问题
- ✅ 多会话管理（新建、切换、删除、重命名）
- ✅ 引用知识库文档（@ 引用）
- ✅ 临时文件上传（短期记忆，不入库）
- ✅ 闲聊检测，自动跳过无关 RAG 检索

**闲聊检测规则**：当消息长度 ≤ 6 字符且匹配预设模式（如"你好"、"谢谢"等）时，跳过知识库检索。

### 📝 智能练习（Practice）

**路径**：`/practice`

- 从知识库或题库选择练习主题
- 支持选择题和简答题
- AI 实时批改并给出解释
- 完成后显示成绩统计

### 📊 成绩回顾（History）

**路径**：`/history`

- 练习历史记录
- 正确率统计
- 学习进度追踪

### 🏠 学习看板（Home）

**路径**：`/`

- 学习概览
- 快捷入口

---

### 管理后台

### 📈 数据看板（Dashboard）

**路径**：`/admin`

- 系统使用统计
- 近期活动
- 热门问题

### 📚 知识管理（Knowledge）

**路径**：`/admin/knowledge`

- 上传文档（支持 .docx, .pdf, .md, .txt）
- 文档自动解析、分块、向量化
- 查看文档分块详情
- 删除文档（带确认对话框）

### 🗂️ 题库设置（Settings）

**路径**：`/admin/settings`

- 创建题目集
- 自动/手动添加题目
- AI 重新生成题目
- 管理题目集和单个题目

---

## 项目结构

```
practiceAI/
├── backend/                    # 后端（FastAPI）
│   ├── start.sh               # 一键启动脚本
│   ├── .env.example           # 环境变量模板
│   ├── .venv/                 # Python 虚拟环境
│   └── app/
│       ├── app_main.py        # FastAPI 入口
│       ├── .env               # 环境变量（不提交）
│       ├── requirements.txt   # Python 依赖
│       ├── models/            # 数据模型（SQLAlchemy ORM）
│       │   ├── base.py        # Base 声明
│       │   ├── chat.py        # ChatSession, ChatMessage
│       │   ├── knowledge.py   # Document, DocumentChunk
│       │   ├── question.py    # QuestionSet, Question
│       │   └── user.py        # User
│       ├── router/            # API 路由
│       │   ├── chat_rt.py     # 聊天（消息发送、SSE 流式）
│       │   ├── knowledge_rt.py # 知识库（上传、解析、删除）
│       │   ├── practice_rt.py # 练习（开始、提交、结果）
│       │   ├── question_rt.py # 题目管理
│       │   ├── settings_rt.py # 系统设置
│       │   ├── history_rt.py  # 历史记录
│       │   ├── admin_rt.py    # 管理后台
│       │   └── user_rt.py     # 用户认证
│       ├── schemas/           # Pydantic 请求/响应模型
│       ├── service/           # 业务逻辑
│       │   ├── llm.py         # LLM 调用（流式/非流式）
│       │   ├── rag.py         # RAG 检索引擎
│       │   ├── prompts.py     # 系统提示词模板
│       │   ├── document_parser.py  # 文档解析器
│       │   └── auth.py        # 认证服务
│       ├── utils/             # 工具类
│       │   ├── database.py    # 数据库连接
│       │   └── get_logger.py  # 日志配置
│       └── uploads/           # 上传文件存储
│
└── frontend/                  # 前端（React + Vite）
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── app/
        │   ├── api.ts         # API 请求封装
        │   ├── routes.ts      # 路由配置
        │   ├── components/    # 通用组件
        │   │   └── ConfirmDialog.tsx  # 确认对话框
        │   ├── layouts/       # 布局组件
        │   │   ├── StudentLayout.tsx  # 学生端布局
        │   │   └── AdminLayout.tsx    # 管理端布局
        │   └── pages/
        │       ├── Login.tsx          # 登录页
        │       ├── student/           # 学生端页面
        │       │   ├── Home.tsx       # 学习看板
        │       │   ├── Chat.tsx       # 智能导师
        │       │   ├── Practice.tsx   # 智能练习
        │       │   └── History.tsx    # 成绩回顾
        │       └── admin/             # 管理后台页面
        │           ├── Dashboard.tsx      # 数据看板
        │           ├── Knowledge.tsx      # 知识管理
        │           ├── DocumentChunks.tsx  # 文档分块详情
        │           ├── Questions.tsx      # 题目管理
        │           └── Settings.tsx       # 系统设置
        └── styles/
            └── markdown.css   # Markdown 渲染样式
```

---

## API 接口

后端 API 文档可通过 http://127.0.0.1:8000/docs 查看（Swagger UI）。

### 主要接口分组

| 分组     | 前缀                   | 说明                         |
| -------- | ---------------------- | ---------------------------- |
| 用户认证 | `/api/user`            | 登录、注册                   |
| 聊天     | `/api/chat`            | 会话管理、消息发送（SSE）    |
| 知识库   | `/api/admin/knowledge` | 文档上传、解析、管理         |
| 题库     | `/api/admin/questions` | 题目集、题目 CRUD            |
| 练习     | `/api/practice`        | 开始练习、提交答案、获取结果 |
| 历史     | `/api/history`         | 练习记录、统计               |
| 管理     | `/api/admin/dashboard` | 数据统计                     |
| 设置     | `/api/admin/settings`  | 系统参数配置                 |

### 聊天消息 SSE 流格式

发送消息 `POST /api/chat/sessions/{id}/messages` 返回 Server-Sent Events：

```
data: {"type": "thinking", "content": "思考内容..."}
data: {"type": "content", "content": "正式回答内容..."}
data: {"type": "citations", "citations": [{...}]}
data: {"type": "suggested_questions", "questions": ["...", "..."]}
data: {"type": "done"}
```

### 请求示例

```bash
# 创建会话
curl -X POST http://127.0.0.1:8000/api/chat/sessions

# 发送消息（带临时文件）
curl -X POST http://127.0.0.1:8000/api/chat/sessions/{session_id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "这份文件的主要内容是什么",
    "file_context": "\n【report.md】\n文件内容...\n",
    "attached_docs": ["report.md"]
  }'

# 引用知识库文档提问
curl -X POST http://127.0.0.1:8000/api/chat/sessions/{session_id}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "RAG是什么",
    "document_ids": [1, 2]
  }'
```

---

## 开发指南

### RAG 检索流程

```
用户提问
  │
  ▼
闲聊检测 ──是──▶ 跳过检索，直接对话
  │ 否
  ▼
向量化用户问题
  │
  ▼
在知识库中检索 top_k=5, threshold=0.3
  │
  ▼
构建 RAG Prompt（参考内容 + 系统指令）
  │
  ▼
判断是否有临时文件
  ├─ 有 → 追加到 Prompt，引用显示临时文件
  └─ 无 → 引用显示知识库文档
  │
  ▼
调用 LLM（DeepSeek-R1，SSE 流式输出）
  │
  ▼
返回：回答 + 引用 + 推荐问题
```

### 会话标题生成

- **策略**：从用户第一条消息中提取关键短语（不使用 LLM，避免推理模型输出思考过程）
- **处理**：去除冗余前缀（"请问"、"帮我"等）和末尾标点，取前 12 个字
- **示例**：`"请问RAG是什么？"` → `"RAG是什么"`

### 组件复用

- **ConfirmDialog**：所有删除操作统一使用确认对话框组件
  ```tsx
  import ConfirmDialog from '@/app/components/ConfirmDialog';
  
  <ConfirmDialog
    open={showConfirm}
    title="确认删除"
    message="删除后不可恢复，确定继续？"
    variant="danger"
    onConfirm={handleDelete}
    onCancel={() => setShowConfirm(false)}
  />
  ```

### 添加新功能的步骤

1. **后端**：`models/` 定义数据模型 → `schemas/` 定义请求/响应 → `service/` 编写业务逻辑 → `router/` 编写 API 路由
2. **前端**：`api.ts` 添加 API 调用 → `pages/` 编写页面组件 → `routes.ts` 注册路由

### 日志查看

```bash
# 实时查看后端日志
tail -f /tmp/practiceai_backend.log

# 查看 RAG 检索日志
grep "RAG" /tmp/practiceai_backend.log

# 查看错误
grep "ERROR" /tmp/practiceai_backend.log
```

---

## 常见问题

### Q: 引用来源不显示？
- 确认知识库中有已上传且已完成解析的文档
- 检查 RAG 检索日志：`grep "检索到" /tmp/practiceai_backend.log`
- 闲聊消息（如"你好"）会自动跳过检索，不显示引用

### Q: 会话标题显示异常？
- 标题从用户消息中直接提取，不经过 LLM
- 最多显示 12 个字符

### Q: 临时文件上传后引用的是知识库内容？
- 确认使用的是"+"按钮上传临时文件，而非管理后台上传
- 临时文件引用会显示 📎 前缀
- 临时文件优先于知识库引用

### Q: 后端启动失败？
```bash
# 检查端口占用
lsof -i :8000
# 检查日志
tail -20 /tmp/practiceai_backend.log
# 检查数据库连接
cat practiceAI/backend/app/.env | grep DATABASE
```

### Q: 前端页面不更新？
- 使用 `Cmd+Shift+R` 强制刷新清除浏览器缓存
- 确认前端开发服务器正在运行：`lsof -i :5173`

---

## 版本信息

- **后端框架**：FastAPI 0.115 + SQLAlchemy 1.4
- **前端框架**：React 19 + Vite 6 + TailwindCSS
- **大模型**：DeepSeek-R1-Distill-Qwen-14B（via SiliconFlow）
- **数据库**：PostgreSQL + Redis
