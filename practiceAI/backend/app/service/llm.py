from openai import OpenAI
import os
import re
import json
from dotenv import load_dotenv
from utils import logger

load_dotenv()

# LLM 配置
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.siliconflow.cn/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B")


def get_llm_client() -> OpenAI:
    """获取 OpenAI 兼容客户端"""
    return OpenAI(
        api_key=LLM_API_KEY,
        base_url=LLM_BASE_URL,
    )


def _strip_think_tags(text: str) -> str:
    """移除 <think>...</think> 标签及其内容"""
    return re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()


def chat_simple(prompt: str, system_prompt: str = None) -> str:
    """非流式调用大模型，直接返回文本结果"""
    try:
        client = get_llm_client()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            max_tokens=100,
        )
        text = response.choices[0].message.content or ""
        return _strip_think_tags(text).strip().strip('"').strip("'")
    except Exception as e:
        logger.error(f"chat_simple 调用失败: {e}")
        return ""


def generate_session_title(user_message: str) -> str:
    """根据用户第一条消息，提取简短会话标题（不使用LLM，避免推理泄露）"""
    msg = user_message.strip()
    # 去掉冗余前缀（保留核心问句）
    msg = re.sub(r'^(请问一下|请问|请教|帮我看看|帮我|告诉我|解释一下|介绍一下|说说|讲讲|谈谈|我想了解|我想知道)', '', msg).strip()
    # 去掉末尾标点
    msg = re.sub(r'[？?！!。.…]+$', '', msg).strip()
    # 取前12个字，保持有意义的短语
    title = msg[:12] if msg else user_message[:12]
    return title


def chat_stream(messages: list[dict], system_prompt: str = None):
    """
    流式调用大模型，返回生成器。

    :param messages: 消息历史 [{"role": "user", "content": "..."}]
    :param system_prompt: 系统提示词（可选）
    :return: 生成器，每次 yield 一个 dict:
             {"type": "thinking", "content": "..."} 思考过程
             {"type": "content", "content": "..."}  正式回答
             {"type": "done", "full_response": "..."} 完成
             {"type": "error", "content": "..."}     错误
    """
    try:
        client = get_llm_client()

        # 组装消息
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        logger.info(f"调用大模型: model={LLM_MODEL}, messages={len(full_messages)}")

        # 创建流式请求
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=full_messages,
            stream=True,
        )

        full_response = ""
        thinking_content = ""
        # R1 Distill 模型总是以 <think> 开头，所以默认进入思考模式
        in_think_block = True
        content_buffer = ""  # 缓冲区，用于处理标签跨 chunk 的情况

        for chunk in completion:
            choice = chunk.choices[0]

            if choice.finish_reason == "stop":
                # 如果缓冲区还有剩余内容
                if content_buffer:
                    if in_think_block:
                        yield {"type": "thinking", "content": content_buffer}
                    else:
                        yield {"type": "content", "content": content_buffer}
                # 清理最终响应中的 <think> 标签
                clean_response = _strip_think_tags(full_response)
                yield {"type": "done", "full_response": clean_response}
                break

            delta = choice.delta

            # 处理 DeepSeek R1 的思考过程（reasoning_content 属性，部分 API 支持）
            if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                thinking_content += delta.reasoning_content
                yield {"type": "thinking", "content": delta.reasoning_content}
                continue

            # 处理正常内容
            if delta.content:
                full_response += delta.content
                content_buffer += delta.content

                # 持续检查缓冲区中的标签
                while True:
                    if in_think_block:
                        # 在思考块中，寻找 </think>
                        end_idx = content_buffer.find("</think>")
                        if end_idx != -1:
                            # 输出 </think> 之前的内容为 thinking
                            before = content_buffer[:end_idx]
                            if before:
                                yield {"type": "thinking", "content": before}
                            in_think_block = False
                            content_buffer = content_buffer[end_idx + len("</think>"):]
                        else:
                            # 没找到结束标签，检查是否可能是部分标签
                            # 保留最后 8 个字符（</think> 长度）以防标签跨 chunk
                            safe_len = len(content_buffer) - 8
                            if safe_len > 0:
                                yield {"type": "thinking", "content": content_buffer[:safe_len]}
                                content_buffer = content_buffer[safe_len:]
                            break
                    else:
                        # 在正常内容中，寻找 <think>
                        start_idx = content_buffer.find("<think>")
                        if start_idx != -1:
                            before = content_buffer[:start_idx]
                            if before:
                                yield {"type": "content", "content": before}
                            in_think_block = True
                            content_buffer = content_buffer[start_idx + len("<think>"):]
                        else:
                            # 没找到开始标签，安全输出（保留可能的部分标签）
                            safe_len = len(content_buffer) - 7
                            if safe_len > 0:
                                yield {"type": "content", "content": content_buffer[:safe_len]}
                                content_buffer = content_buffer[safe_len:]
                            break

    except Exception as e:
        logger.error(f"大模型调用失败: {str(e)}")
        yield {"type": "error", "content": str(e)}


def chat_block(messages: list[dict], system_prompt: str = None) -> str:
    """
    非流式调用大模型，返回完整响应文本。
    用于不需要流式输出的场景，如出题、批改等。

    :param messages: 消息历史
    :param system_prompt: 系统提示词（可选）
    :return: 完整的响应文本（已清理 think 标签）
    """
    try:
        client = get_llm_client()

        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        logger.info(f"非流式调用大模型: model={LLM_MODEL}, messages={len(full_messages)}")

        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=full_messages,
            stream=False,
        )

        raw_response = completion.choices[0].message.content or ""
        clean_response = _strip_think_tags(raw_response)
        return clean_response
    except Exception as e:
        logger.error(f"大模型调用失败: {str(e)}")
        return ""


# 默认的系统提示词（从集中管理的 prompts.py 导入）
from service.prompts import CHAT_SYSTEM_PROMPT as PRACTICE_AI_SYSTEM_PROMPT
