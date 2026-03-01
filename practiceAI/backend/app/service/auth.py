"""
认证依赖 —— 提供 FastAPI Depends 注入的当前用户信息

使用方法：
    from service.auth import get_current_user, require_admin
    
    @router.get("/")
    async def my_route(current_user: dict = Depends(get_current_user)):
        user_id = current_user["user_id"]
        ...
    
    @router.get("/admin-only")
    async def admin_route(current_user: dict = Depends(require_admin)):
        ...
"""

from utils.database import get_db, SessionLocal
from models.user import User
from utils.password import verify_password
from sqlalchemy.exc import SQLAlchemyError
from exceptions.auth import AuthError
from fastapi_jwt import JwtAccessBearerCookie
from fastapi import Depends, HTTPException, status
import secrets
from datetime import timedelta
import os
import logging

# JWT配置
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'practice_ai_secret_key') + 'happy'

# 从请求头或cookie中读取访问令牌
access_security = JwtAccessBearerCookie(
    secret_key=JWT_SECRET_KEY,
    auto_error=True,
    access_expires_delta=timedelta(days=2)
)

def create_token(user_id: int, user_name: str, role: str = "student"):
    subject = {
        "user_id": user_id,
        "user_name": user_name,
        "role": role,
        "salting": secrets.token_hex(16)
    }
    access_token = access_security.create_access_token(subject=subject)
    return access_token


def authenticate(username: str, password: str) -> str:
    """认证用户"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise AuthError("用户名或密码错误")
        if not verify_password(password, user.password_hash):
            raise AuthError("用户名或密码错误")
        return create_token(user.id, user.username, user.role)
    except SQLAlchemyError as e:
        raise AuthError("认证失败") from e
    finally:
        db.close()


def register_user(username: str, password: str):
    """注册新用户"""
    from utils.password import hash_password

    logger = logging.getLogger(__name__)
    db = next(get_db())
    try:
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise AuthError("用户名已存在")

        password_hash = hash_password(password)
        new_user = User(username=username, password_hash=password_hash, role='student')
        db.add(new_user)
        db.commit()
        logger.info(f"用户 {username} 注册成功")

    except SQLAlchemyError as e:
        db.rollback()
        raise AuthError(f"注册失败: {str(e)}")
    except AuthError:
        raise
    except Exception as e:
        db.rollback()
        raise AuthError(f"注册失败: {str(e)}")
    finally:
        db.close()


# ==================== 认证依赖（Depends）====================

async def get_current_user(credentials=Depends(access_security)) -> dict:
    """
    从 JWT token 中提取当前用户信息。
    
    返回: {"user_id": int, "user_name": str, "role": str}
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供有效的认证凭证",
        )
    subject = credentials.subject
    if not isinstance(subject, dict) or "user_id" not in subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 Token 格式",
        )
    return subject


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    要求当前用户必须是管理员角色。
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user
