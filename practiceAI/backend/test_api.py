#!/usr/bin/env python3
"""测试 practiceAI 后端所有 API 接口"""
import requests
import json
import sys

BASE = "http://127.0.0.1:8001"
TOKEN = None
PASS = 0
FAIL = 0
ERRORS = []


def test(name, method, path, data=None, expect_status=200, auth=True):
    global TOKEN, PASS, FAIL, ERRORS
    headers = {"Content-Type": "application/json"}
    if auth and TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    url = f"{BASE}{path}"
    try:
        if method == "GET":
            r = requests.get(url, headers=headers)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            r = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unknown method: {method}")

        if r.status_code == expect_status:
            PASS += 1
            print(f"  ✅ {name} -> {r.status_code}")
            return r.json() if r.text else {}
        else:
            FAIL += 1
            detail = r.text[:200]
            ERRORS.append(f"{name}: expected {expect_status}, got {r.status_code} - {detail}")
            print(f"  ❌ {name} -> {r.status_code}: {detail}")
            return None
    except Exception as e:
        FAIL += 1
        ERRORS.append(f"{name}: EXCEPTION - {str(e)}")
        print(f"  ❌ {name} -> EXCEPTION: {str(e)}")
        return None


print("=" * 60)
print("practiceAI 后端接口测试")
print("=" * 60)

# ===== 1. 认证模块 =====
print("\n📋 1. 认证模块")
# Login
res = test("登录(admin)", "POST", "/api/auth/login",
           {"username": "admin", "password": "admin123"}, auth=False)
if res and "access_token" in res:
    TOKEN = res["access_token"]
    print(f"     Token: {TOKEN[:30]}...")

# Register
test("注册新用户", "POST", "/api/auth/register",
     {"username": "student1", "password": "test123"}, auth=False)

# Login as student
res = test("登录(student1)", "POST", "/api/auth/login",
           {"username": "student1", "password": "test123"}, auth=False)
student_token = res.get("access_token") if res else None

# Duplicate register
test("重复注册(应失败)", "POST", "/api/auth/register",
     {"username": "student1", "password": "test123"}, expect_status=400, auth=False)

# Wrong password
test("错误密码(应401)", "POST", "/api/auth/login",
     {"username": "admin", "password": "wrong"}, expect_status=401, auth=False)

# ===== 2. 题库管理 =====
print("\n📋 2. 题库管理")
# Create question
q1 = test("创建选择题", "POST", "/api/admin/questions/", {
    "type": "choice",
    "question": "AI产品经理需要掌握哪些核心能力？",
    "options": ["技术能力", "产品思维", "数据分析", "以上都是"],
    "correct_answer": "以上都是",
    "explanation": "需要同时具备技术、产品和数据能力",
    "category": "AI产品基础",
    "difficulty": "easy"
})

q2 = test("创建问答题", "POST", "/api/admin/questions/", {
    "type": "essay",
    "question": "请描述AI产品经理的日常工作流程",
    "correct_answer": "需求分析、产品设计、模型评估、上线迭代",
    "explanation": "AI产品经理的工作涵盖从需求到上线的全流程",
    "category": "AI产品基础",
    "difficulty": "medium"
})

q3 = test("创建第三题", "POST", "/api/admin/questions/", {
    "type": "choice",
    "question": "以下哪个不是AI模型评估指标？",
    "options": ["准确率", "召回率", "服务器带宽", "F1值"],
    "correct_answer": "服务器带宽",
    "category": "AI模型与技术选型",
    "difficulty": "medium"
})

question_id_1 = q1["id"] if q1 else None
question_id_2 = q2["id"] if q2 else None
question_id_3 = q3["id"] if q3 else None

# List
test("获取题目列表", "GET", "/api/admin/questions/")
test("按分类筛选", "GET", "/api/admin/questions/?category=AI产品基础")
test("搜索题目", "GET", "/api/admin/questions/?search=核心能力")

# Update
if question_id_1:
    test("修改题目", "PUT", f"/api/admin/questions/{question_id_1}", {
        "difficulty": "medium",
        "explanation": "更新后的解释"
    })

# ===== 3. 练习配置 =====
print("\n📋 3. 练习配置")
test("获取配置", "GET", "/api/admin/settings/")
test("更新配置", "PUT", "/api/admin/settings/", {
    "question_count": 20,
    "passing_score": 70,
    "time_limit": 1800
})

# ===== 4. 知识库管理 =====
print("\n📋 4. 知识库管理")
test("获取文档列表", "GET", "/api/admin/knowledge/documents")
test("获取知识库统计", "GET", "/api/admin/knowledge/stats")

# ===== 5. 练习功能 =====
print("\n📋 5. 练习功能")
test("获取知识库列表", "GET", "/api/practice/knowledge-bases")

# Start practice
session_res = test("开始练习", "POST", "/api/practice/sessions", {
    "knowledge_base": "all",
    "question_type": "all",
    "question_count": 10
})

session_id = session_res.get("session_id") if session_res else None
questions = session_res.get("questions", []) if session_res else []

# Submit answers
if session_id and questions:
    for q in questions[:2]:
        if q["type"] == "choice" and q.get("options"):
            answer = q["options"][0]  # pick first option
        else:
            answer = "这是一个测试答案"
        test(f"提交答案(题目{q['id']})", "POST",
             f"/api/practice/sessions/{session_id}/submit",
             {"question_id": q["id"], "user_answer": answer})

    # Finish session
    test("完成练习", "POST", f"/api/practice/sessions/{session_id}/finish?duration=120")
    test("获取练习结果", "GET", f"/api/practice/sessions/{session_id}/result")

# ===== 6. 智能问答 =====
print("\n📋 6. 智能问答")
chat_res = test("创建问答会话", "POST", "/api/chat/sessions")
chat_session_id = chat_res.get("session_id") if chat_res else None

test("获取会话列表", "GET", "/api/chat/sessions")

if chat_session_id:
    # Send message (SSE - just test that it returns 200)
    try:
        r = requests.post(
            f"{BASE}/api/chat/sessions/{chat_session_id}/messages",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
            json={"message": "什么是RAG技术？"},
            stream=True
        )
        content = ""
        for line in r.iter_lines(decode_unicode=True):
            if line.startswith("data: "):
                data = json.loads(line[6:])
                if data.get("type") == "content":
                    content += data.get("content", "")
                elif data.get("type") == "done":
                    break
        if content:
            PASS += 1
            print(f"  ✅ 发送消息(SSE流式) -> 200, 收到 {len(content)} 字")
        else:
            FAIL += 1
            ERRORS.append("SSE消息: 没有收到内容")
            print(f"  ❌ 发送消息(SSE流式) -> 无内容")
    except Exception as e:
        FAIL += 1
        ERRORS.append(f"SSE消息: {str(e)}")
        print(f"  ❌ 发送消息(SSE流式) -> {str(e)}")

    test("获取会话消息", "GET", f"/api/chat/sessions/{chat_session_id}/messages")

# ===== 7. 历史记录 =====
print("\n📋 7. 历史记录")
test("练习历史", "GET", "/api/history/practice")
if session_id:
    test("练习详情", "GET", f"/api/history/practice/{session_id}")
test("问答历史", "GET", "/api/history/chat")
test("学员统计", "GET", "/api/history/stats")

# ===== 8. 管理概览 =====
print("\n📋 8. 管理概览")
test("Dashboard统计", "GET", "/api/admin/dashboard/stats")
test("最近活动", "GET", "/api/admin/dashboard/recent-activities")
test("热门问题", "GET", "/api/admin/dashboard/popular-questions")

# ===== 9. 清理: 删除测试题目 =====
print("\n📋 9. 边界测试")
if question_id_3:
    test("删除题目", "DELETE", f"/api/admin/questions/{question_id_3}")
test("删除不存在的题目", "DELETE", "/api/admin/questions/99999", expect_status=404)

# ===== 结果汇总 =====
print("\n" + "=" * 60)
print(f"测试结果: ✅ {PASS} 通过  ❌ {FAIL} 失败")
print("=" * 60)

if ERRORS:
    print("\n失败详情:")
    for e in ERRORS:
        print(f"  • {e}")

sys.exit(1 if FAIL > 0 else 0)
