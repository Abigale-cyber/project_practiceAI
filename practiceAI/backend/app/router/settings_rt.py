from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from utils.database import get_db
from utils import logger
from models.settings import PracticeSettings
from schemas.settings import PracticeSettingsResponse, PracticeSettingsUpdate
from service.auth import require_admin

router = APIRouter(prefix="/api/admin/settings", tags=["系统设置"])


@router.get("/", response_model=PracticeSettingsResponse)
async def get_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """获取系统设置（管理员）"""
    try:
        settings = db.query(PracticeSettings).filter(PracticeSettings.id == 1).first()
        if not settings:
            settings = PracticeSettings(id=1)
            db.add(settings)
            db.commit()
            db.refresh(settings)

        return PracticeSettingsResponse(
            quiz_topics=settings.quiz_topics or [],
            question_count=settings.question_count or 5,
            question_types=settings.question_types or ["choice", "essay"],
            quiz_difficulty=settings.quiz_difficulty or "medium",
            quiz_focus=settings.quiz_focus or ["concept", "compare", "apply", "process"],
            quiz_custom_instruction=settings.quiz_custom_instruction or "",
            grading_strictness=settings.grading_strictness or "medium",
            grading_style=settings.grading_style or "encouraging",
            passing_score=settings.passing_score or 60,
            show_answer=settings.show_answer if settings.show_answer is not None else True,
            grading_custom_instruction=settings.grading_custom_instruction or "",
            time_limit=settings.time_limit or 0,
        )
    except Exception as e:
        logger.error(f"获取配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/", response_model=PracticeSettingsResponse)
async def update_settings(
    data: PracticeSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """更新系统设置（管理员）"""
    try:
        user_id = current_user["user_id"]

        settings = db.query(PracticeSettings).filter(PracticeSettings.id == 1).first()
        if not settings:
            settings = PracticeSettings(id=1)
            db.add(settings)

        update_data = data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        settings.updated_by = user_id

        db.commit()
        db.refresh(settings)

        return PracticeSettingsResponse(
            quiz_topics=settings.quiz_topics or [],
            question_count=settings.question_count or 5,
            question_types=settings.question_types or ["choice", "essay"],
            quiz_difficulty=settings.quiz_difficulty or "medium",
            quiz_focus=settings.quiz_focus or ["concept", "compare", "apply", "process"],
            quiz_custom_instruction=settings.quiz_custom_instruction or "",
            grading_strictness=settings.grading_strictness or "medium",
            grading_style=settings.grading_style or "encouraging",
            passing_score=settings.passing_score or 60,
            show_answer=settings.show_answer if settings.show_answer is not None else True,
            grading_custom_instruction=settings.grading_custom_instruction or "",
            time_limit=settings.time_limit or 0,
        )
    except Exception as e:
        db.rollback()
        logger.error(f"更新配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
