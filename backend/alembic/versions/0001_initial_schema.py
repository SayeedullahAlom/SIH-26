"""initial schema - Legal Metrology Compliance app (Phase 0, faithfully reproduced)

Revision ID: 0001
Revises:
Create Date: 2026-08-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------
    # Extensions (must exist before any UUID/vector column is created)
    # ------------------------------------------------------------
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # ------------------------------------------------------------
    # users
    # ------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False, server_default="officer"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("role IN ('officer', 'admin')", name="users_role_check"),
        sa.UniqueConstraint("email", name="users_email_key"),
    )

    # ------------------------------------------------------------
    # rules_chunks
    # ------------------------------------------------------------
    op.create_table(
        "rules_chunks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("clause_reference", sa.Text(), nullable=False),
        sa.Column("chapter", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # HNSW index for fast cosine-similarity retrieval (pgvector >= 0.5).
    # Written as raw SQL: SQLAlchemy's Index() construct does not have a
    # portable way to express "USING hnsw (col vector_cosine_ops)", and
    # this needs to match the finalized schema exactly.
    op.execute(
        "CREATE INDEX idx_rules_chunks_embedding "
        "ON rules_chunks USING hnsw (embedding vector_cosine_ops)"
    )

    # ------------------------------------------------------------
    # inspections
    # ------------------------------------------------------------
    op.create_table(
        "inspections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("officer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=True),
        sa.Column("manufacturer_hint", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("overall_result", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["officer_id"], ["users.id"], name="inspections_officer_id_fkey"),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name="inspections_status_check",
        ),
        sa.CheckConstraint(
            "overall_result IN ('COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED')",
            name="inspections_overall_result_check",
        ),
    )
    op.create_index("idx_inspections_officer", "inspections", ["officer_id"])
    op.create_index("idx_inspections_status", "inspections", ["status"])
    op.create_index("idx_inspections_created_at", "inspections", ["created_at"])

    # ------------------------------------------------------------
    # inspection_images
    # ------------------------------------------------------------
    op.create_table(
        "inspection_images",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("s3_url", sa.Text(), nullable=False),
        sa.Column("side", sa.Text(), nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            name="inspection_images_inspection_id_fkey",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "side IN ('front', 'back', 'left', 'right', 'top', 'bottom', 'other')",
            name="inspection_images_side_check",
        ),
    )
    op.create_index("idx_inspection_images_inspection", "inspection_images", ["inspection_id"])

    # ------------------------------------------------------------
    # declarations
    # ------------------------------------------------------------
    op.create_table(
        "declarations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_image_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("declaration_type", sa.Text(), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("legible", sa.Boolean(), nullable=True),
        sa.Column("bounding_box", postgresql.JSONB(), nullable=True),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            name="declarations_inspection_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["source_image_id"],
            ["inspection_images.id"],
            name="declarations_source_image_id_fkey",
        ),
        sa.CheckConstraint(
            "declaration_type IN ("
            "'manufacturer_packer_importer', 'product_identity', 'net_quantity', "
            "'date_info', 'mrp', 'dimensions', 'consumer_care', 'other')",
            name="declarations_declaration_type_check",
        ),
    )
    op.create_index("idx_declarations_inspection", "declarations", ["inspection_id"])
    op.create_index("idx_declarations_type", "declarations", ["declaration_type"])

    # ------------------------------------------------------------
    # checklist_results
    # ------------------------------------------------------------
    op.create_table(
        "checklist_results",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("check_type", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("reason_text", sa.Text(), nullable=False),
        sa.Column("related_declaration_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("related_rule_chunk_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            name="checklist_results_inspection_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["related_declaration_id"],
            ["declarations.id"],
            name="checklist_results_related_declaration_id_fkey",
        ),
        sa.ForeignKeyConstraint(
            ["related_rule_chunk_id"],
            ["rules_chunks.id"],
            name="checklist_results_related_rule_chunk_id_fkey",
        ),
        sa.CheckConstraint(
            "check_type IN ("
            "'identity', 'responsible_party', 'quantity', 'price', 'dates', "
            "'consumer_care', 'presentation', 'other')",
            name="checklist_results_check_type_check",
        ),
        sa.CheckConstraint(
            "result IN ('PASS', 'ISSUE', 'REVIEW_REQUIRED')",
            name="checklist_results_result_check",
        ),
    )
    op.create_index("idx_checklist_results_inspection", "checklist_results", ["inspection_id"])
    op.create_index(
        "idx_checklist_results_type_result", "checklist_results", ["check_type", "result"]
    )

    # ------------------------------------------------------------
    # reports
    # ------------------------------------------------------------
    op.create_table(
        "reports",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pdf_url", sa.Text(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["inspection_id"],
            ["inspections.id"],
            name="reports_inspection_id_fkey",
            ondelete="CASCADE",
        ),
    )
    op.create_index("idx_reports_inspection", "reports", ["inspection_id"])

    # ------------------------------------------------------------
    # updated_at trigger for inspections
    # ------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_inspections_updated_at
            BEFORE UPDATE ON inspections
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_inspections_updated_at ON inspections")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")

    op.drop_index("idx_reports_inspection", table_name="reports")
    op.drop_table("reports")

    op.drop_index("idx_checklist_results_type_result", table_name="checklist_results")
    op.drop_index("idx_checklist_results_inspection", table_name="checklist_results")
    op.drop_table("checklist_results")

    op.drop_index("idx_declarations_type", table_name="declarations")
    op.drop_index("idx_declarations_inspection", table_name="declarations")
    op.drop_table("declarations")

    op.drop_index("idx_inspection_images_inspection", table_name="inspection_images")
    op.drop_table("inspection_images")

    op.drop_index("idx_inspections_created_at", table_name="inspections")
    op.drop_index("idx_inspections_status", table_name="inspections")
    op.drop_index("idx_inspections_officer", table_name="inspections")
    op.drop_table("inspections")

    op.execute("DROP INDEX IF EXISTS idx_rules_chunks_embedding")
    op.drop_table("rules_chunks")

    op.drop_table("users")

    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
    op.execute("DROP EXTENSION IF EXISTS vector")
