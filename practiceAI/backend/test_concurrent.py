#!/usr/bin/env python3
"""
practiceAI 后端并发压力测试
================================
使用 asyncio + httpx 对核心 API 进行多并发用户模拟测试。

用法:
    # 安装依赖
    pip install httpx

    # 运行（默认 10 并发，基础 URL: http://127.0.0.1:8001）
    python test_concurrent.py

    # 自定义参数
    python test_concurrent.py --url http://127.0.0.1:8001 --concurrency 20 --rounds 3
"""

import asyncio
import httpx
import time
import argparse
import statistics
import json
from dataclasses import dataclass, field
from typing import List, Optional

# ──────────────────────────────────────────
# 配置
# ──────────────────────────────────────────
DEFAULT_BASE_URL   = "http://127.0.0.1:8001"
DEFAULT_CONCURRENCY = 10   # 并发用户数
DEFAULT_ROUNDS      = 3    # 每轮重复次数（统计均值用）
REQUEST_TIMEOUT     = 60.0 # 单请求超时（秒）


# ──────────────────────────────────────────
# 结果记录
# ──────────────────────────────────────────
@dataclass
class Result:
    api_name:   str
    status:     int           # HTTP status code；-1 表示异常/超时
    elapsed_ms: float
    error:      Optional[str] = None


@dataclass
class Summary:
    api_name:     str
    total:        int
    success:      int
    fail:         int
    min_ms:       float
    max_ms:       float
    avg_ms:       float
    p95_ms:       float
    errors:       List[str] = field(default_factory=list)

    @property
    def success_rate(self) -> str:
        return f"{self.success / self.total * 100:.1f}%"


# ──────────────────────────────────────────
# 核心请求辅助
# ──────────────────────────────────────────
async def _request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    api_name: str,
    token: Optional[str] = None,
    **kwargs,
) -> Result:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    t0 = time.perf_counter()
    try:
        resp = await client.request(method, url, headers=headers, timeout=REQUEST_TIMEOUT, **kwargs)
        elapsed = (time.perf_counter() - t0) * 1000
        return Result(api_name=api_name, status=resp.status_code, elapsed_ms=elapsed)
    except httpx.TimeoutException as e:
        elapsed = (time.perf_counter() - t0) * 1000
        return Result(api_name=api_name, status=-1, elapsed_ms=elapsed, error=f"超时: {e}")
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        return Result(api_name=api_name, status=-1, elapsed_ms=elapsed, error=str(e))


# ──────────────────────────────────────────
# 场景函数：每个并发"用户"执行的一轮操作
# ──────────────────────────────────────────
async def scenario_auth(client: httpx.AsyncClient, base: str, user_idx: int) -> List[Result]:
    """场景 1：登录接口并发"""
    results = []
    # 用管理员账号登录（不创建新账号，避免重复注册冲突）
    r = await _request(client, "POST", f"{base}/api/auth/login", "登录",
                       json={"username": "admin", "password": "admin123"})
    results.append(r)
    return results


async def scenario_knowledge(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 2：知识库查询并发（只读，无副作用）"""
    results = []
    r1 = await _request(client, "GET", f"{base}/api/admin/knowledge/documents", "知识库-文档列表", token=token)
    results.append(r1)
    r2 = await _request(client, "GET", f"{base}/api/admin/knowledge/stats", "知识库-统计", token=token)
    results.append(r2)
    return results


async def scenario_chat_session(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 3：并发创建聊天会话 + 获取会话列表"""
    results = []
    r1 = await _request(client, "POST", f"{base}/api/chat/sessions", "Chat-创建会话", token=token)
    results.append(r1)
    r2 = await _request(client, "GET", f"{base}/api/chat/sessions", "Chat-会话列表", token=token)
    results.append(r2)
    return results


async def scenario_practice_list(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 4：并发获取练习相关列表（只读）"""
    results = []
    r1 = await _request(client, "GET", f"{base}/api/practice/knowledge-bases", "Practice-知识库列表", token=token)
    results.append(r1)
    return results


async def scenario_question_crud(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 5：并发创建题目 + 列表查询（有写操作，测试数据库并发写入）"""
    results = []
    # 并发创建一道选择题
    create_data = {
        "type": "choice",
        "question": "并发测试题目：以下哪个是测试框架？",
        "options": ["pytest", "django", "sqlalchemy", "fastapi"],
        "correct_answer": "pytest",
        "explanation": "pytest 是 Python 测试框架",
        "category": "并发测试",
        "difficulty": "easy",
    }
    r1 = await _request(client, "POST", f"{base}/api/admin/questions/", "Questions-创建题目",
                        token=token, json=create_data)
    results.append(r1)

    # 创建后立即查询列表
    r2 = await _request(client, "GET", f"{base}/api/admin/questions/", "Questions-列表查询", token=token)
    results.append(r2)
    return results


async def scenario_settings(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 6：并发读/写系统配置（测试并发写冲突）"""
    results = []
    r1 = await _request(client, "GET", f"{base}/api/admin/settings/", "Settings-读取", token=token)
    results.append(r1)
    r2 = await _request(client, "PUT", f"{base}/api/admin/settings/", "Settings-写入",
                        token=token, json={"question_count": 10, "passing_score": 60, "time_limit": 1800})
    results.append(r2)
    return results


async def scenario_history(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 7：并发拉取历史记录"""
    results = []
    r1 = await _request(client, "GET", f"{base}/api/history/practice", "History-练习历史", token=token)
    results.append(r1)
    r2 = await _request(client, "GET", f"{base}/api/history/chat", "History-问答历史", token=token)
    results.append(r2)
    r3 = await _request(client, "GET", f"{base}/api/history/stats", "History-统计", token=token)
    results.append(r3)
    return results


async def scenario_dashboard(client: httpx.AsyncClient, base: str, token: str) -> List[Result]:
    """场景 8：并发访问管理 Dashboard"""
    results = []
    r1 = await _request(client, "GET", f"{base}/api/admin/dashboard/stats", "Dashboard-统计", token=token)
    results.append(r1)
    r2 = await _request(client, "GET", f"{base}/api/admin/dashboard/recent-activities", "Dashboard-近期活动", token=token)
    results.append(r2)
    results.append(
        await _request(client, "GET", f"{base}/api/admin/dashboard/popular-questions", "Dashboard-热门问题", token=token)
    )
    return results


# ──────────────────────────────────────────
# 并发执行器
# ──────────────────────────────────────────
async def run_concurrent(
    base: str,
    concurrency: int,
    rounds: int,
) -> List[Result]:
    """
    执行多轮并发测试，返回所有 Result。
    每轮：concurrency 个虚拟用户同时执行 8 个场景的任务。
    """
    all_results: List[Result] = []

    async with httpx.AsyncClient(base_url=base) as client:
        # ① 先顺序登录，获取共享 token（避免并发注册冲突）
        print("[ 准备 ] 登录获取 Token ...")
        try:
            resp = await client.post(
                "/api/auth/login",
                json={"username": "admin", "password": "admin123"},
                timeout=REQUEST_TIMEOUT,
            )
            token = resp.json().get("access_token", "")
            if not token:
                print("  ⚠️  未获取到 Token，认证接口可能未准备好。仍继续执行（无 token 的请求将返回 401）")
        except Exception as e:
            token = ""
            print(f"  ⚠️  登录失败: {e}，继续执行……")

        for round_idx in range(1, rounds + 1):
            print(f"\n{'─'*50}")
            print(f"[ 第 {round_idx}/{rounds} 轮 ]  并发用户数: {concurrency}")
            print(f"{'─'*50}")

            # 为每位并发用户构建任务列表
            async def user_tasks(uid: int) -> List[Result]:
                results: List[Result] = []
                results += await scenario_auth(client, base, uid)
                results += await scenario_knowledge(client, base, token)
                results += await scenario_chat_session(client, base, token)
                results += await scenario_practice_list(client, base, token)
                results += await scenario_question_crud(client, base, token)
                results += await scenario_settings(client, base, token)
                results += await scenario_history(client, base, token)
                results += await scenario_dashboard(client, base, token)
                return results

            # 并发触发所有用户
            t_start = time.perf_counter()
            tasks = [user_tasks(i) for i in range(concurrency)]
            round_results_nested = await asyncio.gather(*tasks, return_exceptions=True)
            t_round = (time.perf_counter() - t_start) * 1000

            for item in round_results_nested:
                if isinstance(item, Exception):
                    all_results.append(
                        Result(api_name="整体异常", status=-1, elapsed_ms=0, error=str(item))
                    )
                else:
                    all_results.extend(item)

            print(f"  ✅ 本轮耗时: {t_round:.0f} ms")

    return all_results


# ──────────────────────────────────────────
# 统计 & 打印
# ──────────────────────────────────────────
def summarize(results: List[Result]) -> List[Summary]:
    from collections import defaultdict
    groups: dict[str, List[Result]] = defaultdict(list)
    for r in results:
        groups[r.api_name].append(r)

    summaries = []
    for api_name, rs in sorted(groups.items()):
        latencies = [r.elapsed_ms for r in rs]
        successes = [r for r in rs if 200 <= r.status < 500 and r.status != -1]
        fails = [r for r in rs if r.status == -1 or r.status >= 500]
        errors = [r.error for r in rs if r.error]

        p95 = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0.0

        summaries.append(Summary(
            api_name=api_name,
            total=len(rs),
            success=len(successes),
            fail=len(fails),
            min_ms=min(latencies) if latencies else 0,
            max_ms=max(latencies) if latencies else 0,
            avg_ms=statistics.mean(latencies) if latencies else 0,
            p95_ms=p95,
            errors=list(set(errors)),
        ))
    return summaries


def print_report(summaries: List[Summary], concurrency: int, rounds: int):
    print("\n" + "=" * 70)
    print(f"  并发测试报告  (并发用户: {concurrency}  轮次: {rounds})")
    print("=" * 70)
    header = f"{'API 名称':<30} {'总数':>5} {'成功率':>8} {'最小ms':>8} {'平均ms':>8} {'P95ms':>8} {'最大ms':>8}"
    print(header)
    print("-" * 70)

    for s in summaries:
        flag = "❌" if s.fail > 0 else "✅"
        rate_color = s.success_rate
        print(
            f"{flag} {s.api_name:<28} {s.total:>5} {rate_color:>8} "
            f"{s.min_ms:>7.0f} {s.avg_ms:>8.0f} {s.p95_ms:>8.0f} {s.max_ms:>8.0f}"
        )
        if s.errors:
            for e in s.errors[:3]:  # 最多展示 3 条错误
                print(f"     └─ 错误: {e[:80]}")

    total_req  = sum(s.total   for s in summaries)
    total_fail = sum(s.fail    for s in summaries)
    total_ok   = sum(s.success for s in summaries)
    print("=" * 70)
    print(f"  总请求: {total_req}   成功: {total_ok}   失败: {total_fail}   "
          f"总成功率: {total_ok/total_req*100:.1f}%")
    print("=" * 70)


# ──────────────────────────────────────────
# 入口
# ──────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="practiceAI 后端并发压力测试")
    parser.add_argument("--url",         default=DEFAULT_BASE_URL,    help="后端地址")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help="并发用户数")
    parser.add_argument("--rounds",      type=int, default=DEFAULT_ROUNDS,      help="测试轮次")
    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════════╗
║        practiceAI  并发压力测试               ║
╠══════════════════════════════════════════════╣
║  目标地址: {args.url:<33}║
║  并发用户: {args.concurrency:<33}║
║  测试轮次: {args.rounds:<33}║
╚══════════════════════════════════════════════╝
""")

    results = asyncio.run(run_concurrent(args.url, args.concurrency, args.rounds))
    summaries = summarize(results)
    print_report(summaries, args.concurrency, args.rounds)


if __name__ == "__main__":
    main()
