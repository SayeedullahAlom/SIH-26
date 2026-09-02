import uuid

from sqlalchemy import DateTime, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InspectionExtraction(Base):
    __tablename__ = "inspection_extractions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("uuid_generate_v4()"),
    )

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False,
    )

    extraction_data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    inspection = relationship(
        "Inspection",
        back_populates="extractions",
    )