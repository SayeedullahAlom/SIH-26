from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime
import uuid

VerdictStatus = Literal["PASS", "ISSUE", "REVIEW_REQUIRED"]

class CategoryVerdict(BaseModel):
    category: str
    verdict: VerdictStatus
    reasoning: Optional[str] = None
    rule_reference: Optional[str] = None

class InspectionVerdictResponse(BaseModel):
    inspection_id: uuid.UUID
    overall_status: VerdictStatus
    categories: list[CategoryVerdict]
    created_at: datetime

    class Config:
        from_attributes = True