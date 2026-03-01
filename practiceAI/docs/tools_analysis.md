# 项目工具链分析报告

根据对 `practiceAI` 项目代码库的分析，项目采用了前后端分离的架构，并集成了 RAG（检索增强生成）与多种大模型服务。以下是项目中所使用的核心工具与技术框架清单。

<div style="background-color: #fce4ec; padding: 20px; border-radius: 8px;">
<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; background-color: #fff0f5; color: #212121;">
  <thead style="background-color: #f48fb1; color: #ffffff;">
    <tr>
      <th style="padding: 12px; border: 1px solid #f06292; text-align: left;">分类</th>
      <th style="padding: 12px; border: 1px solid #f06292; text-align: left;">工具 / 技术</th>
      <th style="padding: 12px; border: 1px solid #f06292; text-align: left;">用途说明</th>
    </tr>
  </thead>
  <tbody>
    <!-- 前端生态 -->
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0; font-weight: bold;" rowspan="7">前端 (Frontend)</td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>React</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">核心的前端视图层框架（React 18）。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Vite</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">构建工具，提供极速的开发服务器和轻量的打包环境。</td>
    </tr>
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Tailwind CSS</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">原子化 CSS 框架，核心样式构建模式。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>MUI & Radix UI</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">基础 UI 组件库（包括主题和图标系统），配合无头组件(Radix)使用。</td>
    </tr>
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Emotion</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">CSS-in-JS 样式解决方案，部分组件样式的实现依赖。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Framer Motion (motion)</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">实现平滑页面过渡及组件动效。</td>
    </tr>
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>React Router</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">管理单页面应用客户端路由。</td>
    </tr>

    <!-- 后端生态 -->
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0; font-weight: bold;" rowspan="5">后端 (Backend)</td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>FastAPI & Uvicorn</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">核心的异步 Web 开发框架，具备超高的响应性能；Uvicorn 作为 ASGI 服务器。</td>
    </tr>
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>SQLAlchemy</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">Python 的 ORM 框架，负责以面向对象的方式操作数据库。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Pydantic</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">用于接口数据的格式验证与校验（FastAPI 内置依赖）。</td>
    </tr>
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>JWT / JOSE / authlib</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">完成用户注册、登录的加密及分发签发 Token，安全认证流程。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>bcrypt</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">专门用于用户密码等敏感数据的哈希算法库。</td>
    </tr>

    <!-- 数据与云服务 -->
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0; font-weight: bold;" rowspan="2">数据与存储<br/>(Data & Storage)</td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Supabase (PostgreSQL)</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">核心的关系型数据库，使用 Supabase 托管部署的云版 PostgreSQL 服务。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Redis</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">键值内存数据库，使用 Docker-Compose 部署，用于状态维护与高速缓存（如并发控制和会话态）。</td>
    </tr>

    <!-- 人工智能与解析引擎 -->
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0; font-weight: bold;" rowspan="4">AI 模型与大语言生态</td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>SiliconFlow API</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">大模型推理提供商（结合 DeepSeek-R1-Distill-Qwen-14B 模型能力）。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>DashScope</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">阿里云的百炼服务 SDK 插件，项目引入以弥补特定模型嵌入(Embedding)功能或作为多模型对接的接口。</td>
    </tr>
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>OpenAI SDK</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">统一的对话调用包接口（兼容类似 OpenAI 协议的基础调用）。</td>
    </tr>
    <tr style="background-color: #fff0f5;">
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>PyPDF2 / python-docx</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">文档解析器，用于对上传的 PDF 或 Word 数据进行切片与 RAG 解析喂给大模型。</td>
    </tr>

    <!-- 运维 -->
    <tr style="background-color: #fce4ec;">
      <td style="padding: 10px; border: 1px solid #f8bbd0; font-weight: bold;">运维与设施 (DevOps)</td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;"><strong>Docker / Compose</strong></td>
      <td style="padding: 10px; border: 1px solid #f8bbd0;">统一容器化入口与编排工具，目前配置用于管理 API 与本地架构及 Redis 的串接流程。</td>
    </tr>
  </tbody>
</table>
</div>
