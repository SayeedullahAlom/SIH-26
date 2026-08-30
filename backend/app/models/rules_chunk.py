import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RulesChunk(Base):
    """
    One row per Legal Metrology clause chunk, loaded once by an ingestion
    script (not part of Phase 1). `embedding` is only populated once the
    RAG pipeline (a later phase) generates it.
    """

    __tablename__ = "rules_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()")
    )
    clause_reference: Mapped[str] = mapped_column(Text, nullable=False)
    chapter: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    text_: Mapped[str] = mapped_column("text", Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    checklist_results = relationship("ChecklistResult", back_populates="related_rule_chunk")
