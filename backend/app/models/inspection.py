import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base   # ← was app.db.session
from app.models.compliance_verdict import ComplianceVerdict


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    officer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    product_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    manufacturer_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="pending")
    overall_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # NOTE: kept in sync by the `set_updated_at()` trigger created in the
    # Alembic migration - not by SQLAlchemy's `onupdate`. See migration
    # 0001 for details on why.
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    officer = relationship("User", back_populates="inspections")
    images = relationship(
        "InspectionImage", back_populates="inspection", cascade="all, delete-orphan"
    )
    declarations = relationship(
        "Declaration", back_populates="inspection", cascade="all, delete-orphan"
    )
    checklist_results = relationship(
        "ChecklistResult", back_populates="inspection", cascade="all, delete-orphan"
    )
    reports = relationship(
        "Report", back_populates="inspection", cascade="all, delete-orphan"
    )

    extractions = relationship(
    "InspectionExtraction",
    back_populates="inspection",
    cascade="all, delete-orphan",
)
    verdicts = relationship(
    "ComplianceVerdict",
    back_populates="inspection",
    cascade="all, delete-orphan"
)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name="inspections_status_check",
        ),
        CheckConstraint(
            "overall_result IN ('COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED')",
            name="inspections_overall_result_check",
        ),
    )
