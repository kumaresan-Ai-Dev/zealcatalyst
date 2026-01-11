from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import User, UserRole
from app.models.tutor import TutorProfile
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token
from app.services.email_service import email_service
from datetime import timedelta
from app.core.config import settings
import traceback

router = APIRouter()
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await User.find_one(User.email == payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    try:
        existing_user = await User.find_one(User.email == user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role=user_data.role,
            phone=user_data.phone
        )
        await user.insert()

        # If registering as tutor, create tutor profile
        if user_data.role == UserRole.TUTOR:
            tutor_profile = TutorProfile(
                user_id=str(user.id),
                full_name=user.full_name,
                email=user.email
            )
            await tutor_profile.insert()

        # Send welcome email
        try:
            await email_service.send_welcome_email(
                to_email=user.email,
                user_name=user.full_name,
                is_tutor=(user_data.role == UserRole.TUTOR)
            )
        except Exception as e:
            print(f"[Email] Failed to send welcome email: {e}")

        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return Token(
            access_token=access_token,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                phone=user.phone,
                avatar=user.avatar,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await User.find_one(User.email == credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            phone=user.phone,
            avatar=user.avatar,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        phone=current_user.phone,
        avatar=current_user.avatar,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )
