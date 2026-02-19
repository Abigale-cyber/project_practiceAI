"""
题目集管理 —— 教师配置出题、LLM 生成题目、永久存储

流程：
1. 教师创建「题目集」：指定主题、知识库、题型、难度等
2. 点击「生成题目」→ 后台调用 LLM → 生成题目 → 存入 questions 表
3. 教师可以预览、编辑、删除单个题目
4. 学生练习时直接从 questions 表取已存好的题目
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from utils.database import get_db, SessionLocal
from utils import logger
from models.question import QuestionSet, Question
from models.knowledge import KnowledgeDocument, KnowledgeChunk
from service.llm import chat_block
from service.prompts import QUIZ_SYSTEM_PROMPT
import json
import re

router = APIRouter(prefix="/api/admin/questions", tags=["题目管理"])

TEST_USER_ID = 1


# ==================== 题目集CRUD ====================

@router.get("/sets")
async def list_question_sets(db: Session = Depends(get_db)):
    """获取所有题目集"""
    try:
        sets = db.query(QuestionSet).order_by(QuestionSet.created_at.desc()).all()
        result = []
        for s in sets:
            q_count = db.query(Question).filter(Question.set_id == s.id).count()
            result.append({
                "id": s.id,
                "topic_name": s.topic_name,
                "knowledge_base_id": s.knowledge_base_id,
                "knowledge_base_name": s.knowledge_base_name,
                "question_count": s.question_count,
                "actual_count": q_count,
                "question_types": s.question_types,
                "difficulty": s.difficulty,
                "focus": s.focus,
                "custom_instruction": s.custom_instruction,
                "status": s.status,
                "is_active": s.is_active,
                "created_at": str(s.created_at) if s.created_at else None,
                "updated_at": str(s.updated_at) if s.updated_at else None,
            })
        return result
    except Exception as e:
        logger.error(f"获取题目集列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sets")
async def create_question_set(
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """创建题目集并自动生成题目"""
    try:
        # 获取知识库名称
        kb_name = ""
        kb_id = data.get("knowledge_base_id", "")
        if kb_id and kb_id != "all":
            doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == int(kb_id)).first()
            if doc:
                kb_name = doc.name

        question_set = QuestionSet(
            topic_name=data.get("topic_name", "未命名主题"),
            knowledge_base_id=kb_id,
            knowledge_base_name=kb_name,
            question_count=data.get("question_count", 3),
            question_types=data.get("question_types", ["choice"]),
            difficulty=data.get("difficulty", "medium"),
            focus=data.get("focus", []),
            custom_instruction=data.get("custom_instruction", ""),
            status="generating",
        )
        db.add(question_set)
        db.commit()
        db.refresh(question_set)

        # 后台生成题目
        background_tasks.add_task(
            _generate_questions_background,
            question_set.id,
        )

        return {
            "id": question_set.id,
            "status": "generating",
            "message": "题目集已创建，AI 正在生成题目...",
        }
    except Exception as e:
        db.rollback()
        logger.error(f"创建题目集失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sets/{set_id}")
async def get_question_set(set_id: int, db: Session = Depends(get_db)):
    """获取题目集详情（含题目列表）"""
    try:
        s = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="题目集不存在")

        questions = db.query(Question).filter(
            Question.set_id == set_id
        ).order_by(Question.sort_order).all()

        return {
            "id": s.id,
            "topic_name": s.topic_name,
            "knowledge_base_id": s.knowledge_base_id,
            "knowledge_base_name": s.knowledge_base_name,
            "question_count": s.question_count,
            "question_types": s.question_types,
            "difficulty": s.difficulty,
            "focus": s.focus,
            "custom_instruction": s.custom_instruction,
            "status": s.status,
            "is_active": s.is_active,
            "created_at": str(s.created_at) if s.created_at else None,
            "questions": [
                {
                    "id": q.id,
                    "question_type": q.question_type,
                    "content": q.content,
                    "options": q.options,
                    "answer": q.answer,
                    "explanation": q.explanation,
                    "sort_order": q.sort_order,
                }
                for q in questions
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取题目集详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sets/{set_id}")
async def update_question_set(set_id: int, data: dict, db: Session = Depends(get_db)):
    """编辑题目集配置"""
    try:
        s = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="题目集不存在")

        editable = ["topic_name", "knowledge_base_id", "knowledge_base_name",
                     "question_count", "question_types", "difficulty",
                     "focus", "custom_instruction", "is_active"]
        for key in editable:
            if key in data:
                setattr(s, key, data[key])

        # 若修改了知识库 ID，同步更新名称
        if "knowledge_base_id" in data and "knowledge_base_name" not in data:
            kb_id = data["knowledge_base_id"]
            if kb_id and kb_id != "all":
                doc = db.query(KnowledgeDocument).filter(
                    KnowledgeDocument.id == int(kb_id)
                ).first()
                if doc:
                    s.knowledge_base_name = doc.name

        db.commit()
        db.refresh(s)
        return {"message": "更新成功", "id": s.id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新题目集失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sets/{set_id}/questions")
async def add_question_to_set(set_id: int, data: dict, db: Session = Depends(get_db)):
    """手动向题目集添加单个题目"""
    try:
        s = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="题目集不存在")

        # 获取当前最大排序
        max_order = db.query(Question).filter(
            Question.set_id == set_id
        ).count()

        q = Question(
            set_id=set_id,
            question_type=data.get("question_type", "choice"),
            content=data.get("content", ""),
            options=data.get("options"),
            answer=data.get("answer", ""),
            explanation=data.get("explanation", ""),
            sort_order=max_order,
        )
        db.add(q)

        # 确保题目集状态为 ready
        if s.status != "ready":
            s.status = "ready"

        db.commit()
        db.refresh(q)
        return {
            "id": q.id,
            "question_type": q.question_type,
            "content": q.content,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
            "sort_order": q.sort_order,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"添加题目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sets/{set_id}")
async def delete_question_set(set_id: int, db: Session = Depends(get_db)):
    """删除题目集（级联删除题目）"""
    try:
        s = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="题目集不存在")

        db.query(Question).filter(Question.set_id == set_id).delete()
        db.delete(s)
        db.commit()
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除题目集失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sets/{set_id}/regenerate")
async def regenerate_questions(
    set_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """重新生成题目（删除旧题目后重新调用 LLM）"""
    try:
        s = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not s:
            raise HTTPException(status_code=404, detail="题目集不存在")

        # 删除旧题目
        db.query(Question).filter(Question.set_id == set_id).delete()
        s.status = "generating"
        db.commit()

        background_tasks.add_task(_generate_questions_background, set_id)

        return {"status": "generating", "message": "正在重新生成题目..."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"重新生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 单题编辑 ====================

@router.put("/questions/{question_id}")
async def update_question(question_id: int, data: dict, db: Session = Depends(get_db)):
    """编辑单个题目"""
    try:
        q = db.query(Question).filter(Question.id == question_id).first()
        if not q:
            raise HTTPException(status_code=404, detail="题目不存在")

        if "content" in data:
            q.content = data["content"]
        if "options" in data:
            q.options = data["options"]
        if "answer" in data:
            q.answer = data["answer"]
        if "explanation" in data:
            q.explanation = data["explanation"]
        if "question_type" in data:
            q.question_type = data["question_type"]

        db.commit()
        db.refresh(q)
        return {
            "id": q.id,
            "question_type": q.question_type,
            "content": q.content,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新题目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/questions/{question_id}")
async def delete_question(question_id: int, db: Session = Depends(get_db)):
    """删除单个题目"""
    try:
        q = db.query(Question).filter(Question.id == question_id).first()
        if not q:
            raise HTTPException(status_code=404, detail="题目不存在")
        db.delete(q)
        db.commit()
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除题目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 后台生成逻辑 ====================

def _generate_questions_background(set_id: int):
    """后台任务：调用 LLM 生成题目并存入数据库"""
    db = SessionLocal()
    try:
        question_set = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
        if not question_set:
            return

        # 1. 获取知识库内容
        knowledge_content = _get_knowledge_content(question_set.knowledge_base_id, db)
        if not knowledge_content:
            question_set.status = "error"
            db.commit()
            logger.error(f"题目集 {set_id} 的知识库无内容")
            return

        # 2. 构建出题指令
        count = question_set.question_count or 3
        types = question_set.question_types or ["choice"]
        difficulty = question_set.difficulty or "medium"
        focus = question_set.focus or []
        custom = question_set.custom_instruction or ""

        diff_map = {"easy": "简单", "medium": "适中", "hard": "困难"}
        diff_text = diff_map.get(difficulty, "适中")

        type_text = ""
        if types == ["choice"]:
            type_text = f"请生成 {count} 道选择题。"
        elif types == ["essay"]:
            type_text = f"请生成 {count} 道问答题。"
        else:
            choice_count = max(1, count * 3 // 5)
            essay_count = count - choice_count
            type_text = f"请生成 {choice_count} 道选择题和 {essay_count} 道问答题，共 {count} 道题。"

        focus_map = {
            "concept": "概念理解",
            "compare": "对比分析",
            "apply": "实际应用",
            "process": "流程步骤",
        }
        focus_text = ""
        if focus:
            focus_names = [focus_map.get(f, f) for f in focus]
            focus_text = f"\n考查侧重点：{'/'.join(focus_names)}。"

        custom_text = f"\n教师补充要求：{custom}" if custom else ""

        user_message = f"""{type_text}
难度要求：{diff_text}。{focus_text}{custom_text}

【知识库内容】:
{knowledge_content}

请根据以上知识库内容出题。"""

        # 3. 调用 LLM
        logger.info(f"题目集 {set_id} 开始生成题目: count={count}")
        llm_response = chat_block(
            messages=[{"role": "user", "content": user_message}],
            system_prompt=QUIZ_SYSTEM_PROMPT,
        )

        if not llm_response:
            question_set.status = "error"
            db.commit()
            logger.error(f"题目集 {set_id} LLM 返回空")
            return

        # 4. 解析题目
        questions = _parse_questions(llm_response)
        if not questions:
            question_set.status = "error"
            db.commit()
            logger.error(f"题目集 {set_id} 解析失败")
            return

        # 5. 存入数据库
        for i, q_data in enumerate(questions):
            q = Question(
                set_id=set_id,
                question_type=q_data.get("type", "choice"),
                content=q_data.get("question", ""),
                options=q_data.get("options"),
                answer=q_data.get("correct_answer", ""),
                explanation=q_data.get("explanation", ""),
                sort_order=i,
            )
            db.add(q)

        question_set.status = "ready"
        question_set.question_count = len(questions)
        db.commit()
        logger.info(f"题目集 {set_id} 生成完成: {len(questions)} 题")

    except Exception as e:
        db.rollback()
        try:
            question_set = db.query(QuestionSet).filter(QuestionSet.id == set_id).first()
            if question_set:
                question_set.status = "error"
                db.commit()
        except:
            pass
        logger.error(f"题目集 {set_id} 生成异常: {str(e)}")
    finally:
        db.close()


def _get_knowledge_content(knowledge_base_id: str, db: Session) -> str:
    """从知识库获取内容"""
    try:
        if not knowledge_base_id or knowledge_base_id == "all":
            chunks = db.query(KnowledgeChunk).join(
                KnowledgeDocument,
                KnowledgeChunk.document_id == KnowledgeDocument.id
            ).filter(
                KnowledgeDocument.status == "processed"
            ).limit(20).all()
        else:
            chunks = db.query(KnowledgeChunk).filter(
                KnowledgeChunk.document_id == int(knowledge_base_id)
            ).limit(20).all()

        if not chunks:
            return ""

        import random
        selected = random.sample(chunks, min(10, len(chunks)))
        return "\n\n---\n\n".join([c.content for c in selected if c.content])
    except Exception as e:
        logger.error(f"获取知识库内容失败: {str(e)}")
        return ""


def _parse_questions(response: str) -> list:
    """解析 LLM 返回的 JSON 题目"""
    if not response:
        return []
    try:
        # 尝试直接解析
        return json.loads(response)
    except:
        pass
    try:
        # 尝试提取 JSON 块
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if match:
            return json.loads(match.group())
    except:
        pass
    try:
        match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except:
        pass
    return []
