# API 与工具库调用及收费情况分析

针对提问中给出的四个依赖项：**SiliconFlow API、DashScope、OpenAI、PyPDF2**，根据对项目代码（特别是后端 `backend/app/service` 目录）的排查，以下是它们实际的调用情况及关联的收费说明：

<div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin-top: 20px;">
<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; background-color: #f1fcff; color: #1a365d;">
  <thead style="background-color: #0288d1; color: #ffffff;">
    <tr>
      <th style="padding: 12px; border: 1px solid #03a9f4; text-align: left;">API / 工具库</th>
      <th style="padding: 12px; border: 1px solid #03a9f4; text-align: center; width: 15%;">是否被调用</th>
      <th style="padding: 12px; border: 1px solid #03a9f4; text-align: left;">项目中的实际调用细节</th>
      <th style="padding: 12px; border: 1px solid #03a9f4; text-align: left; width: 25%;">收费性质</th>
    </tr>
  </thead>
  <tbody>
    <!-- SiliconFlow -->
    <tr style="background-color: #e1f5fe;">
      <td style="padding: 10px; border: 1px solid #81d4fa; font-weight: bold;">SiliconFlow API</td>
      <td style="padding: 10px; border: 1px solid #81d4fa; text-align: center; color: green; font-weight: bold;">✅ 是</td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        在 <code>service/llm.py</code> 和 <code>service/embedding.py</code> 中作为**主力云端 API** 被大量调用。<br/>
        使用了它的 <code>DeepSeek-R1-Distill-Qwen-14B</code> (推理) 以及 <code>BAAI/bge-m3</code> (向量模型)。
      </td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        <span style="color: #c62828;"><strong>需要收费</strong></span><br/>
        基于商业云端服务，需充值 Token 后使用（尽管平台提供了一些免费模型额度，但生产环境下大用量是需要按 Token 消耗买单的）。
      </td>
    </tr>

    <!-- OpenAI SDK -->
    <tr style="background-color: #f1fcff;">
      <td style="padding: 10px; border: 1px solid #81d4fa; font-weight: bold;">OpenAI (SDK)</td>
      <td style="padding: 10px; border: 1px solid #81d4fa; text-align: center; color: green; font-weight: bold;">✅ 是</td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        在代码中执行了 <code>from openai import OpenAI</code>，但<strong>并不是用来调用 ChatGPT。</strong><br/>
        仅仅是将 OpenAI 开发的开源 Python SDK 作为一个“通用客户端”，去连接了完全遵守 OpenAI 接口协议的 SiliconFlow 后台。
      </td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        <span style="color: #2e7d32;"><strong>免费</strong></span><br/>
        因为没有实际请求 <code>api.openai.com</code>，仅使用了其开源代码包作为接口桥梁。
      </td>
    </tr>

    <!-- PyPDF2 -->
    <tr style="background-color: #e1f5fe;">
      <td style="padding: 10px; border: 1px solid #81d4fa; font-weight: bold;">PyPDF2</td>
      <td style="padding: 10px; border: 1px solid #81d4fa; text-align: center; color: green; font-weight: bold;">✅ 是</td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        在 <code>service/document_parser.py</code> 中被动态引入 (<code>from PyPDF2 import PdfReader</code>)。<br/>
        用于本地解析用户上传的 PDF 知识库文件并从中提取文本分页。
      </td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        <span style="color: #2e7d32;"><strong>免费</strong></span><br/>
        完全开源的纯本地 Python 操作包，不存在 API 云端调用，零运行费用。
      </td>
    </tr>

    <!-- DashScope -->
    <tr style="background-color: #f1fcff;">
      <td style="padding: 10px; border: 1px solid #81d4fa; font-weight: bold;">DashScope<br/>(阿里云百炼)</td>
      <td style="padding: 10px; border: 1px solid #81d4fa; text-align: center; color: red; font-weight: bold;">❌ 否</td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        仅在 <code>requirements.txt</code> 依赖列表里被配置过，但对整个后端项目进行代码深度扫描后，并没有找到任何对 <code>dashscope</code> 的实际代码调用。应该是以前测试留下来的闲置依赖包。
      </td>
      <td style="padding: 10px; border: 1px solid #81d4fa;">
        （当前不扣费）<br/>代码中未被调用。如果实际接入使用，也是属于计费的大模型商业 API 平台。
      </td>
    </tr>
  </tbody>
</table>
</div>
