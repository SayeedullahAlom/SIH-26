import uuid
from sqlalchemy import ForeignKey, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from sqlalchemy import Column, text


class ComplianceVerdict(Base):
    __tablename__ = "compliance_verdicts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inspections.id"), nullable=False, index=True
    )

    category: Mapped[str] = mapped_column(Text, nullable=False)
    verdict: Mapped[str] = mapped_column(Text, nullable=False)  # PASS | ISSUE | REVIEW_REQUIRED
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_field: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    rule_reference: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    inspection = relationship("Inspection", back_populates="verdicts")