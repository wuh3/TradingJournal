"""add quality_score to orders

Revision ID: 714bb10880f4
Revises: b36ebe7ba4e3
Create Date: 2026-08-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '714bb10880f4'
down_revision: Union[str, None] = 'b36ebe7ba4e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Optional 0-100 pre-trade quality score on an order (manually entered,
    # e.g. from the Entry Quality Calculator). Nullable, no backfill needed.
    op.add_column('order_items', sa.Column('quality_score', sa.Numeric(precision=5, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('order_items', 'quality_score')
