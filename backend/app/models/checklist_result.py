import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChecklistResult(Base):
    """One row per checklist category per inspection (Section 7 of the requirements doc)."""

    __tablename__ = "checklist_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False,
    )
    check_type: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    reason_text: Mapped[str] = mapped_column(Text, nullable=False)
    related_declaration_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("declarations.id"), nullable=True
    )
    related_rule_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rules_chunks.id"), nullable=True
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    inspection = relationship("Inspection", back_populates="checklist_results")
    related_declaration = relationship("Declaration", back_populates="checklist_results")
    related_rule_chunk = relationship("RulesChunk", back_populates="checklist_results")

    __table_args__ = (
        CheckConstraint(
            "check_type IN ("
            "'identity', 'responsible_party', 'quantity', 'price', 'dates', "
            "'consumer_care', 'presentation', 'other')",
            name="checklist_results_check_type_check",
        ),
        CheckConstraint(
            "result IN ('PASS', 'ISSUE', 'REVIEW_REQUIRED')",
            name="checklist_results_result_check",
        ),
    )
