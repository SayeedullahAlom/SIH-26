import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Declaration(Base):
    """
    Fields extracted from package images by the vision AI (Phase 3+).
    `declaration_type` maps directly to Rule 6(1)(a)-(g) and Rule 6(2).
    """

    __tablename__ = "declarations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_image_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inspection_images.id"), nullable=True
    )
    declaration_type: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    legible: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    bounding_box: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    inspection = relationship("Inspection", back_populates="declarations")
    source_image = relationship("InspectionImage", back_populates="declarations")
    checklist_results = relationship("ChecklistResult", back_populates="related_declaration")

    __table_args__ = (
        CheckConstraint(
            "declaration_type IN ("
            "'manufacturer_packer_importer', 'product_identity', 'net_quantity', "
            "'date_info', 'mrp', 'dimensions', 'consumer_care', 'other')",
            name="declarations_declaration_type_check",
        ),
    )
