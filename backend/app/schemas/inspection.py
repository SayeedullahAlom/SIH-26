import uuid
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

SideType = Literal["front", "back", "left", "right", "top", "bottom", "other"]


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"


class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_key: str


class InspectionImageInput(BaseModel):
    file_key: str = Field(
        description="The file_key obtained from /inspections/presigned-url"
    )
    side: Optional[SideType] = "front"


class InspectionImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    s3_url: str
    side: Optional[str] = None
    download_url: Optional[str] = None
    uploaded_at: datetime


class InspectionCreate(BaseModel):
    product_name: Optional[str] = None
    manufacturer_hint: Optional[str] = None
    images: List[InspectionImageInput] = []


class InspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    officer_id: uuid.UUID
    product_name: Optional[str] = None
    manufacturer_hint: Optional[str] = None
    status: str
    overall_result: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    images: List[InspectionImageResponse] = []