import uuid
from datetime import datetime
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class CategoryVerdictOverride(BaseModel):
    category: str
    status: str
    notes: Optional[str] = None


class OfficerOverrideRequest(BaseModel):
    overall_result: str
    category_verdicts: List[CategoryVerdictOverride]


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


class ComplianceVerdictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[uuid.UUID] = None
    inspection_id: Optional[uuid.UUID] = None
    category: str
    verdict: str
    reasoning: Optional[str] = None
    evidence_field: Optional[str] = None
    evidence_value: Optional[str] = None
    rule_reference: Optional[str] = None
    officer_verdict: Optional[str] = None
    officer_remarks: Optional[str] = None
    created_at: Optional[datetime] = None


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
    extractions: List[Any] = []
    verdicts: List[ComplianceVerdictResponse] = []