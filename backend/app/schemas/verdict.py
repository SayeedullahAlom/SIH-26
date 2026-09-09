from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


VerdictStatus = Literal[
    "PASS",
    "ISSUE",
    "REVIEW_REQUIRED",
    "NOT_APPLICABLE",
]


class CategoryVerdict(BaseModel):
    category: str
    verdict: VerdictStatus
    reasoning: str

    evidence_field: str | None = None
    evidence_value: str | None = None
    rule_reference: str | None = None


class InspectionVerdictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inspection_id: UUID
    overall_status: VerdictStatus
    categories: list[CategoryVerdict]
    created_at: datetime