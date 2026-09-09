import uuid
from datetime import datetime
from pydantic import BaseModel


class CategoryVerdict(BaseModel):
    category: str
    verdict: str
    reasoning: str = ""
    evidence_field: str | None = None
    evidence_value: str | None = None
    rule_reference: str | None = None
    officer_verdict: str | None = None
    officer_remarks: str | None = None


class InspectionVerdictResponse(BaseModel):
    inspection_id: uuid.UUID
    overall_status: str
    categories: list[CategoryVerdict]
    created_at: datetime


class VerdictOverrideRequest(BaseModel):
    category: str
    officer_verdict: str  # PASS | ISSUE | REVIEW_REQUIRED
    officer_remarks: str