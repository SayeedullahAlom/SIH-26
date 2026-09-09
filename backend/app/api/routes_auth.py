import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.jwt import create_access_token
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import (
    AvatarPresignedRequest,
    AvatarUpdateRequest,
    PasswordChangeRequest,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.services.storage import (
    generate_presigned_download_url,
    generate_presigned_upload_url,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class UserProfileRead(BaseModel):
    """GET /auth/me response: officer identity + avatar + audit summary stats."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str
    avatar_url: Optional[str] = None
    avatar_view_url: Optional[str] = None
    created_at: Optional[datetime] = None
    total_inspections: int = 0
    compliant_count: int = 0
    non_compliant_count: int = 0
    pending_count: int = 0


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    if payload.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin accounts cannot be created via self-registration.",
        )

    # Explicit check to verify if email already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="officer",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
        print(f"REGISTRATION INTEGRITY ERROR: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed due to database constraint: {error_msg}",
        )
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
    )

    if user is None:
        raise invalid_credentials
    if not verify_password(payload.password, user.password_hash):
        raise invalid_credentials

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserProfileRead)
def read_current_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileRead:
    """Retrieve the logged-in officer's profile, avatar viewing URL, and audit stats."""
    total = (
        db.query(func.count(Inspection.id))
        .filter(Inspection.officer_id == current_user.id)
        .scalar()
        or 0
    )

    compliant = (
        db.query(func.count(Inspection.id))
        .filter(
            Inspection.officer_id == current_user.id,
            Inspection.overall_result.ilike("%compliant%"),
            ~Inspection.overall_result.ilike("%non%"),
        )
        .scalar()
        or 0
    )

    non_compliant = (
        db.query(func.count(Inspection.id))
        .filter(
            Inspection.officer_id == current_user.id,
            Inspection.overall_result.ilike("%non%compliant%"),
        )
        .scalar()
        or 0
    )

    pending = (
        db.query(func.count(Inspection.id))
        .filter(
            Inspection.officer_id == current_user.id,
            Inspection.status == "pending",
        )
        .scalar()
        or 0
    )

    avatar_view_url = None
    if current_user.avatar_url:
        try:
            avatar_view_url = generate_presigned_download_url(current_user.avatar_url)
        except Exception:
            avatar_view_url = None

    return UserProfileRead(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        avatar_url=current_user.avatar_url,
        avatar_view_url=avatar_view_url,
        created_at=current_user.created_at,
        total_inspections=total,
        compliant_count=compliant,
        non_compliant_count=non_compliant,
        pending_count=pending,
    )


@router.put("/me", response_model=UserRead)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Update the officer's own name and/or email."""
    if payload.name:
        current_user.name = payload.name.strip()

    if payload.email and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already used by another account.",
            )
        current_user.email = payload.email

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update profile.",
        )
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify the current password, then set a new one."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password.",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "message": "Password changed successfully."}


@router.post("/avatar/presigned-url")
def get_avatar_upload_url(
    payload: AvatarPresignedRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a presigned PUT URL for uploading a new avatar to R2."""
    extension = payload.filename.rsplit(".", 1)[-1] if "." in payload.filename else "jpg"
    file_key = f"avatars/{current_user.id}/{uuid.uuid4()}.{extension}"
    upload_url = generate_presigned_upload_url(file_key, payload.content_type)
    return {"upload_url": upload_url, "file_key": file_key}


@router.put("/avatar")
def update_avatar(
    payload: AvatarUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist the uploaded avatar's file_key and return a viewing URL."""
    current_user.avatar_url = payload.avatar_key
    db.commit()
    db.refresh(current_user)

    view_url = generate_presigned_download_url(current_user.avatar_url)
    return {
        "status": "success",
        "avatar_url": current_user.avatar_url,
        "avatar_view_url": view_url,
    }