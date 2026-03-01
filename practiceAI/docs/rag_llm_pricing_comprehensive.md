# RAG 智能服务综合报价与大模型计费策略分析

> 说明：
> 1.  向量数据库选用**性能型**，全配置基于阿里云华东1（杭州）预付费官网价核算。
> 2.  全托管方案含**跑代码专属ECS + 托管数据库/向量库 + 公网带宽**；自建方案为单ECS部署所有服务（代码+数据库+向量库），**需自行运维部署**。
> 3.  大模型API（SiliconFlow等）按实际调用量单独计费。
> 4.  1000人以上为企业定制方案，按需配置集群/高可用/弹性扩缩容。

---

## 一、 硬件与云资源配置报价表（含性能型向量库）

<div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; background-color: #faf5fb; color: #311b92;">
  <thead style="background-color: #7b1fa2; color: #ffffff;">
    <tr>
      <th style="padding: 12px; border: 1px solid #9c27b0; text-align: left;">用户规模</th>
      <th style="padding: 12px; border: 1px solid #9c27b0; text-align: left;">部署方式</th>
      <th style="padding: 12px; border: 1px solid #9c27b0; text-align: left;">完整配置详情（华东1预付费）</th>
      <th style="padding: 12px; border: 1px solid #9c27b0; text-align: left;">月费用（元）</th>
      <th style="padding: 12px; border: 1px solid #9c27b0; text-align: left;">核心优势</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #f3e5f5;">
      <td style="padding: 10px; border: 1px solid #ce93d8;">10人</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">云服务器自建 (不含人工)</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>ECS</strong>：ecs.c9i.2xlarge（4核16G）+ ESSD 200GB<br><strong>公网带宽</strong>：10Mbps<br><strong>内置服务</strong>：性能型Milvus+PostgreSQL+Redis</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">1368.64</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">成本最低、单机全包，适合小团队/内测</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ce93d8;">10人</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">阿里云全托管</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>跑代码ECS</strong>：4核16G+200GB<br><strong>公网带宽</strong>：10M（与ECS合计1368.64）<br><strong>托管DB</strong>：PG 4核8G+100GB（465）<br><strong>托管缓存</strong>：Redis 8GB（720）<br><strong>向量库</strong>：Milvus 4CU（628）</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">3181.64</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">免运维，代码独立部署更稳定</td>
    </tr>
    <tr style="background-color: #f3e5f5;">
      <td style="padding: 10px; border: 1px solid #ce93d8;">100人</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">云服务器自建 (不含人工)</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>ECS</strong>：ecs.g9i.2xlarge（8核32G）+ ESSD 500GB<br><strong>公网带宽</strong>：20Mbps<br><strong>内置服务</strong>：性能型Milvus+PostgreSQL+Redis</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">2529.41</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">性价比高，适合多文件传输/企业正式运营</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ce93d8;">100人</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">阿里云全托管</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>跑代码ECS</strong>：8核32G+500GB<br><strong>公网带宽</strong>：20M（与ECS合计2529.41）<br><strong>托管DB</strong>：PG 8核32G+500GB（1460）<br><strong>托管缓存</strong>：Redis 32GB（2880）<br><strong>向量库</strong>：Milvus 8CU（1256）</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">8125.41</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">企业级基础配置，自动备份/高可用</td>
    </tr>
    <tr style="background-color: #f3e5f5;">
      <td style="padding: 10px; border: 1px solid #ce93d8;">1000人</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">云服务器自建 (不含人工)</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>ECS</strong>：ecs.g9i.4xlarge（16核64G）+ ESSD 1024GB<br><strong>公网带宽</strong>：50Mbps<br><strong>内置服务</strong>：性能型Milvus+PostgreSQL+Redis</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">5859.50</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">成本仅为托管1/3，适合有基础运维能力的企业</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ce93d8;">1000人</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">阿里云全托管</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>跑代码ECS</strong>：16核64G+1024G<br><strong>公网带宽</strong>：50M（与ECS合计5859.50）<br><strong>托管DB</strong>：PG 8核32G+1030GB（1990）<br><strong>托管缓存</strong>：Redis 64GB（5760）<br><strong>向量库</strong>：Milvus 16CU（2512）</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">16121.50</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">企业级高可用，SLA 99.99%保障，核心商用</td>
    </tr>
    <tr style="background-color: #f3e5f5;">
      <td style="padding: 10px; border: 1px solid #ce93d8;">＞1000</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">企业定制</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">集群架构 + 弹性扩缩容 + 高级专属运维</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold;">联系咨询</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">适配超大规模/超海量向量场景</td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #ce93d8;">通用 / 均适用</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">[附加] 云服务按量计费</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>对象存储 (OSS)</strong>：存储大量 PDF/Word 等知识库文件<br><strong>计费单价</strong>：存储费约 0.12元/GB/月；公网流量约 0.25~0.5元/GB<br><strong>建议安全策略</strong>：必须采用“标准型（本地冗余）”，严防使用低频/归档被误删产生高倍违约金</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">按量后付费 (价格不高)</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">将大文件从应用服务器剥离，避免磁盘被撑满，防文件下载时卡死核心带宽</td>
    </tr>
    <tr style="background-color: #f3e5f5;">
      <td style="padding: 10px; border: 1px solid #ce93d8;">通用 / 均适用</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">[附加] 云通信服务计费</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;"><strong>国内短信服务 (SMS)</strong>：用于 B/C 端用户注册、登录、安全校验时的验证码下发<br><strong>按量计费单价</strong>：月用量 ≤ 10万条时约为 0.045元/条<br><strong>套餐包(预支)</strong>：例：1000条/50元 (0.05元/条，前期测试)；大企业超大单量最低至约 0.036元/条</td>
      <td style="padding: 10px; border: 1px solid #ce93d8; font-weight: bold; color: #d32f2f;">≈ 0.045元 / 条</td>
      <td style="padding: 10px; border: 1px solid #ce93d8;">实名制及构建独立账号安全体系的必选项，防止机器流量恶意注册</td>
    </tr>
  </tbody>
</table>
</div>


---

## 二、 大模型 API (LLM) 计费机制与商业防护设计

在计算完硬件成本后，RAG 系统中向客户收取大模型 API 的费用是决定业务是否盈利的**最核心环节**。因为 RAG 的原理是**“带资进组”**（每次提问都要附带大量通过向量库检索出来的背景知识片段），这导致单次对话 Token 消耗往往是普通闲聊模式的 10 倍到 50 倍以上。

如果简单地采用“每月无限量包干”，极易造成巨额亏损。以下是市场上最成熟、能保障利润的几种计费模型：

<div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px;">
<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; background-color: #f1f8e9; color: #1b5e20; border: 1px solid #c8e6c9;">
  <thead style="background-color: #388e3c; color: #ffffff;">
    <tr>
      <th style="padding: 12px; border: 1px solid #81c784; text-align: left; width: 15%;">计费模式</th>
      <th style="padding: 12px; border: 1px solid #81c784; text-align: left; width: 25%;">操作方式与规则设定</th>
      <th style="padding: 12px; border: 1px solid #81c784; text-align: left; width: 25%;">计算示例</th>
      <th style="padding: 12px; border: 1px solid #81c784; text-align: left; width: 15%;">优点/缺点</th>
      <th style="padding: 12px; border: 1px solid #81c784; text-align: left; width: 20%;">适用对象与建议</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #e8f5e9;">
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-weight: bold;">一、阶梯式套餐 + 次数封顶 </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        不直接暴露 Token 给客户，而是包装成<strong>“有效问答次数”</strong>。<br/>
        例如：<br/>- 基础版：每月含 1,000 次深度文档问答（超出停用或降速）<br/>- 专业版：每月含 5,000 次问答
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-size: 0.9em; color: #333;">
        后台严格判定：只要大模型成功返回文字即算作 1 次。无论用户问了 10 个字还是 500 个字，只要单次发往模型的上下文被截断控制在 4000 Tokens 以内，均粗暴扣减 1 次可用额度。因网络报错未回答的请求不扣次。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        <strong>优点：</strong>客户容易理解（好算账）；利润率能精准算死，绝不会亏本。<br/>
        <strong>缺点：</strong>长短文档都算1次，后台可能吃点小亏。<br/>
        <strong>用户体验：</strong>用户拥有类似“自助餐”的安全感，完全不用担心每个字扣多少钱，心理负担极小，最容易形成高频使用依赖症。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        <strong>强烈推荐用于 10-100 人规模的中小企业标准化 SaaS 售卖。</strong>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-weight: bold;">二、代币/积分预充值制</td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        系统发行平台积分（如 1元 = 100积分）。所有操作明码标价：<br/>
        - 上传/解析 1MB 文档扣 5 积分<br/>
        - 提问 RAG 每次动态扣除积分（后台按实际消耗的 Token × 1.3 倍换算成积分扣除）。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-size: 0.9em; color: #333;">
        用户提问检索了 3000 Token 上下文，模型回答了 800 Token，总计 3800 Tokens。若底层成本为 0.002元/千Token (折算 0.2积分/千Token)，向用户扣除：3.8 × 0.2 × 1.3(利润率) ≈ 1 积分。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        <strong>优点：</strong>零风险，绝对的所耗即所收；有资金沉淀。<br/>
        <strong>缺点：</strong>体验较差，客户每天看着积分掉会产生焦虑感。<br/>
        <strong>用户体验：</strong>每问一个问题看着积分快速减少，用户潜意识里会去“省着用”，不敢放胆连环追问，时间一长会导致应用整体活跃度和留存率显著下降。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        适用于<strong>按量计费的 C 端工具</strong>或开放型研发平台。
      </td>
    </tr>
    <tr style="background-color: #e8f5e9;">
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-weight: bold;">三、纯透传计费 (BYOK)</td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        <strong>Bring Your Own Key（自带秘钥）</strong><br/>
        只收系统软件和云服务器的“席位费 / 实施部署费”，AI 接口彻底放权，让客户自己在后台填上他们自己的 SiliconFlow 或 阿里云 API Key。Token 账单客户用自己的卡直接付给各大厂商。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-size: 0.9em; color: #888;">
        (客户自填 API Key，直接由厂商向其扣款，不涉及本系统内置 Token 结算账单)
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        <strong>优点：</strong>完全彻底甩锅 AI 成本！只赚软件的稳定纯利。<br/>
        <strong>缺点：</strong>丢失了长期持续薅 Token 差价的利润空间。<br/>
        <strong>用户体验：</strong>好在您的软件系统内不会弹出扣费警告界面，体验很“干净”。缺点是第一次绑定厂商 Key 有操作门槛，且他们依然要面对原厂账单。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        适用于<strong>注重隐私、规模极大（>1000人以上）的政企客户的直接私有化交付。</strong>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-weight: bold;">[附加项] 知识库向量化 (Embedding)</td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        专门针对客户<strong>上传企业文档</strong>的计费策略（此过程调用极廉价/免费的嵌入模型）：<br/>
        - <strong>隐式吸纳（推荐）</strong>：费用极低（几分钱转化一本书），直接包含在基础套餐月费中作为“免费特权”。<br/>
        - <strong>显式扣费（积分制）</strong>：超大文件上传时，按文档大小（如 1MB扣除5个配额）收费限制滥用。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7; font-size: 0.9em; color: #333;">
        用户上传了一份 50MB (约 1000万字) 的规范文档。显式扣费：(50MB/1MB) × 5配额 = 扣除250积分；隐式方案：后台为客户硬扛一次几毛钱的内部解析成本。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        <strong>优点：</strong>能够有效防止恶意脚本无限制疯狂上传“几十 G”垃圾文件瘫痪服务器存储。<br/>
        <strong>用户体验：</strong>若采用“隐式吸纳”，体验极度丝滑；若采用“显式扣费”，上传大文件时看着积分被重扣，会有强烈的心疼感与心理阻拦。
      </td>
      <td style="padding: 10px; border: 1px solid #a5d6a7;">
        当客户上传需求是<strong>“海量长文本资料”</strong>时，必加此防范扣费条款。
      </td>
    </tr>
  </tbody>
</table>
</div>

---

## 三、 Token 原理与防亏损核算公式

为了让您能够设计标准报价单，我们需要把底层 **Tokens 计算成本隐藏，向客户暴露“可见服务价值”**。

### 📌 Token 到底是什么？它的核心计算规则说明

**1. Token 是什么？不是字数！**
Token 是大模型处理文本的基本单位，类似于英语中的“音节”或中文的“词根”。
*   **对于中文**：通常 **1 个汉字 = 1 ~ 1.5 个 Token**。因为大模型底层分词器处理中文稍显复杂，有时一个词被拆分成 2 个 Token。
*   **对于英文**：通常 **1 个单词 ≈ 1.3 个 Token**。非常常见的短单词（如 "the", "a"）可能只算 1 个 Token，而长单词会被切开。

**2. RAG 系统特有的双向计费规则**
大厂商（如 SiliconFlow / 阿里云百炼 / 智谱）的计费是对 **“Input (输入侧)”** 和 **“Output (输出侧)”** 分开计算的，而且价格常常差异巨大。
*   **Input Tokens (提示词计费)：** 这是 RAG 最烧钱的地方！
    当用户打句：“总结产品优势”（约 10 Token），RAG 会从向量库里搜集巨量资料“塞给”模型。**最终输入 = 用户指令 (10) + 系统架构预设词 (100) + 检索出的知识库原始片段 (满载多达 3000~8000 Tokens)。** 
*   **Output Tokens (模型回答计费)：**
    模型最终回复的一长段文字，假设生成了 500 个汉字，那么此时产生约 600 - 800 Tokens 的输出账单。

### 📌 文字转为向量（Embedding）的原理是什么？这部分收费吗？

用户的提问内容和知识库的文档文件在能够被计算机检索之前，<strong>必须先转换成“向量”（一长串浮点数字组成的数组）</strong>。在这个过程中，它使用专门的 **嵌入模型 (Embedding Model)**（如 `BAAI/bge-m3`）。

<div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 5px solid #2196f3; margin-top: 15px; margin-bottom: 20px;">
<h4>💰 Embedding (向量化) 阶段是怎么收费的？</h4>
<p><strong>答案是：同样按 Token 扣费，但价格极其便宜（有时甚至完全免费）！</strong></p>
<ul style="margin-top: 10px;">
  <li><strong>1. 使用收费云端 API：</strong>计费逻辑与大模型完全一样，根据您文档被转化的 Input Token 数量收费。但单价低到可以忽略不计（是大语言模型推理费用的 1/10 甚至 1/100）。</li>
  <li><strong>2. 使用开源云端 API：</strong>像 SiliconFlow 基础开源 Embedding 接口（如 <code>BAAI/bge-m3</code>）通常是<strong>免费的，这部分不收你的钱！</strong></li>
  <li><strong>3. 本地化部署运行：</strong>如果您之后把这个向量库下载到你自己的代码侧，在您自己的 CPU 上纯本地跑转换，<strong>物理层面 100% 无计费</strong>。</li>
</ul>
</div>

---

## 四、 亏损风险盘点与落地发售建议

单纯看服务器硬件的核算，如果你将售卖价格定得高出硬件成本看似是有利润的。但是，**在RAG和AI领域极容易出现隐形成本血亏！** 

### 1. 成本摸底（以 1 次典型 RAG 问答为例）
- 假设用户问一个问题：约 100 Tokens
- 系统从向量库（Milvus）大肆检索出最相关的片段：约 3,000 Tokens 的 Context。
- 汇总提交给大型模型（如 `DeepSeek-R1-Distill-Qwen-14B`）。
- **单次成本推演**：3,000 Tokens (Input) + 800 Tokens (Output)。如果在 SiliconFlow 上均价是约 0.002 元 / 千 Token，则这一问您的底层硬成本约为 **0.0076 元**。
- **预留冗余**：加上 Embedding 向量化的极少成本及出错重试，将**单次问答硬成本标记为 0.015 元**。

### 2. 标准 SaaS 的定价与售卖公式包

您可以将您的系统按如下逻辑拆开售卖（保证绝对的安全和盈利）：

*   **A方案：套餐限额制（卖服务）**
    *   **基础服务费定盘**：使用全托管8125元版本，增加 2.0 系数：**软件费定为 16,800 元/月**。
    *   **内含算力**：在这个月费中，赠送包含每月 **100,000 次** 高级 AI 问答。（内部极值成本大概是 100,000 × 0.015 = 1,500元。远远被利润覆盖）。
    *   **超额算力包**：用超需买“1万次深度问答加送包”，售价 **499 元** (成本约150元，暴利+防止滥用)。

*   **B方案：软件 + BYOK 混合（卖架构）**
    *   每月向客户收 **8,500 元 固定运维托管费**（覆盖之前的 8125元 机器硬开销并微有结余）。
    *   系统完全开放，指导企业自己在 SiliconFlow/阿里云 注册账号并充钱填 API 密钥，大用大付、小用小付，风险剥离。

### 3. 被低估的人力与运维隐形成本
- **业务炸机问题**：单机部署 PostgreSQL、Redis 和极为消耗内存的 Milvus 向量库，只要一遇到高并发极易 OOM 导致服务器死机。人工去重启、恢复数据、安抚投诉，付出的人力工资远高于“全托管方案”省下的几千元。对于企业级应用，强烈建议底层走全托管。
- **OSS流量陷阱**：如果不针对企业级长期留存的文档存储限制容量，后续OSS的公网流出流量费（约 0.8元/GB）会极剧膨胀，必须要设置总GB数上限。

### 💡 核心箴言：防刷烂招
无论用哪一种，您的后端代码中**必须加上限流阀（Rate Limit）、单次最大发往大模型的截断限制 和日用量熔断机制 (Daily Cap)**。不能寄希望于大语言模型给你限制！否则随便写个压测脚本跑一晚上，几百万 Token 飞出，足够买单买哭！

---

## 五、 计费体系后端落地开发 TODO 列表

要在系统中真正跑通上述的“阶梯包月”或“积分预充”模式，当前后端代码 (`practiceAI/backend`) 需要进行以下核心改造：

### 1. 数据库结构改造 (`init.sql`)
- [ ] **扩充 `users` 表字段**：新增 `plan_type` (如 TIER_1, BYOK)、`monthly_quota` (当月总额度/积分)、`used_quota` (已用额度) 和 `user_api_key` (用于纯透传模式的自填 Key)。
- [ ] **新建流水表 `usage_logs`**：记录每一次大模型请求的明细。必含字段：`user_id`, `action_type` (如 chat 或 embed), `input_tokens`, `output_tokens`, `deducted_quota` (本次扣减的系统额度) 和 `created_at`。

### 2. LLM 流式调用与结算改造 (`app/service/llm.py`)
- [ ] **提取真实 Usage 数据**：在 `chat_stream` 方法底层的流式读取循环中，捕获大模型在最后一块 (Chunk) 返回的精确 `usage` (包含 prompt 和 completion 的 Token 使用量) 统计对象。
- [ ] **账单穿透返回**：除了通过 `yield` 将生成文字推给前端，必须在流结束的最后一帧，将刚才捕获的 `usage` 信息抛出给业务层（Controller）。
- [ ] **BYOK 模式动态鉴权**：修改 `get_llm_client()` 工具函数，支持接收用户的 `custom_api_key` 以动态覆盖 `.env` 中的公用 Key 来发起请求。

### 3. 上下文长度与积分流转业务层 (`app/router/xxx_rt.py`)
- [ ] **前置额度防刷拦截器**：接受提问后，准备查询向量库之前，先校验用户 `monthly_quota - used_quota > 0`。若已欠费直接返回 HTTP 402/403 阻断操作。
- [ ] **严格的 Context 物理截断 (最核心)**：在拼接完成发给大模型的 Prompt 前，使用 `tiktoken` 计算总长。必须强制限制 `检索出的知识段落 + 问题原文 <= 4000 Tokens`，超出部分用代码主动舍去！
- [ ] **异步扣费写库**：当 Controller 完成所有的流式响应给用户之后，调用内部异步任务，前往数据库执行 `used_quota + 1` (或按积分扣减公式)，并往 `usage_logs` 表落库。

### 4. 存储、防刷与底层风控 (`Embedding` & `OSS`)
- [ ] **超大文件阻断**：在文档上传接口获取文件 size，如果因为文件过大估算出来的 Embedding 扣费会超出用户剩余积分，立即抛错中断解析，防爆内存、防大军薅毛。
- [ ] **引入限流组件 (Rate Limit)**：借助 Redis 给关键的问答接口和查重接口增加并发时间锁，拦截那些 1 秒钟内发 50 次请求的黑客脚本。
- [ ] **大文件剥离 (OSS 集成)**：把本地存 PDF 和 DOCX 的逻辑重构，对接到阿里云 OSS 官方 SDK，原文件上云，数据库只存云端直链。
