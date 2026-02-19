from utils.database import get_db, SessionLocal
from models.user import User
from utils.password import verify_password
from sqlalchemy.exc import SQLAlchemyError
from exceptions.auth import AuthError
from fastapi_jwt import JwtAccessBearerCookie
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
