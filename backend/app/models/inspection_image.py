import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InspectionImage(Base):
    __tablename__ = "inspection_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False,
    )
    s3_url: Mapped[str] = mapped_column(Text, nullable=False)
    side: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    inspection = relationship("Inspection", back_populates="images")
    declarations = relationship("Declaration", back_populates="source_image")

    __table_args__ = (
        CheckConstraint(
            "side IN ('front', 'back', 'left', 'right', 'top', 'bottom', 'other')",
            name="inspection_images_side_check",
        ),
    )
