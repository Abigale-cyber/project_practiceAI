from fastapi import APIRouter, HTTPException, status
from schemas.user import LoginRequest, RegisterRequest, TokenResponse
from service.auth import authenticate, register_user
from exceptions.auth import AuthError

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """用户登录"""
    try:
        token = authenticate(request.username, request.password)
        return {"access_token": token, "token_type": "bearer"}
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/register")
async def register(request: RegisterRequest):
    """用户注册"""
    try:
        register_user(request.username, request.password)
        return {"message": "注册成功"}
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
