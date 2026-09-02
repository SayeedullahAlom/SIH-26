"""add inspection extractions

Revision ID: 81faf4c914f2
Revises: 0001
Create Date: 2026-09-02 17:21:07.141434

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '81faf4c914f2'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'inspection_extractions',
        sa.Column(
            'id',
            sa.UUID(),
            server_default=sa.text('uuid_generate_v4()'),
            nullable=False
        ),
        sa.Column(
            'inspection_id',
            sa.UUID(),
            nullable=False
        ),
        sa.Column(
            'extraction_data',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False
        ),
        sa.ForeignKeyConstraint(
            ['inspection_id'],
            ['inspections.id'],
            ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('inspection_extractions')