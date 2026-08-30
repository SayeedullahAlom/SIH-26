import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["officer", "admin"]


class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Optional - defaults to 'officer' at the database level, matching the
    # finalized schema's DEFAULT 'officer'. We intentionally do not let a
    # registering user set role='admin' here; see routes_auth.py.
    role: Role | None = None


class UserRead(BaseModel):
    """Public-facing user representation. Never includes password_hash."""

    id: uuid.UUID
    name: str
    email: EmailStr
    role: Role
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
