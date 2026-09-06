"""add compliance_verdicts table

Revision ID: e23ab27a5263
Revises: 81faf4c914f2
Create Date: 2026-09-05 09:59:02.420423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e23ab27a5263'
down_revision: Union[str, None] = '81faf4c914f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('compliance_verdicts',
    sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
    sa.Column('inspection_id', sa.UUID(), nullable=False),
    sa.Column('category', sa.Text(), nullable=False),
    sa.Column('verdict', sa.Text(), nullable=False),
    sa.Column('reasoning', sa.Text(), nullable=True),
    sa.Column('evidence_field', sa.Text(), nullable=True),
    sa.Column('evidence_value', sa.Text(), nullable=True),
    sa.Column('rule_reference', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['inspection_id'], ['inspections.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_compliance_verdicts_inspection_id'), 'compliance_verdicts', ['inspection_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_compliance_verdicts_inspection_id'), table_name='compliance_verdicts')
    op.drop_table('compliance_verdicts')