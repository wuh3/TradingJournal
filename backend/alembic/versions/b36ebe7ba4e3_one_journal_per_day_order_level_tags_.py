"""one journal per day, order-level tags, position_type

Revision ID: b36ebe7ba4e3
Revises: 396283ea8343
Create Date: 2026-08-16 07:27:01.525514

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b36ebe7ba4e3'
down_revision: Union[str, None] = '396283ea8343'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tags move from the journal level to the order level (order_tags),
    # replacing journal_tags. A journal's tags are now computed at read time
    # as the union of its orders' tags -- see app/routers/journals.py.
    op.create_table('order_tags',
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('tag_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['order_items.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('order_id', 'tag_id')
    )
    op.drop_table('journal_tags')

    # One journal per calendar day.
    op.create_unique_constraint('uq_journal_user_date', 'journals', ['user_id', 'date'])

    # New required position_type (long/short) field on orders, distinct from
    # the existing buy/sell direction. There's no way to infer the intended
    # position type for pre-existing orders from historical data, so they're
    # backfilled to LONG as a placeholder -- review/correct any real existing
    # short positions manually after this migration runs.
    position_type_enum = postgresql.ENUM('LONG', 'SHORT', name='position_type')
    position_type_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('order_items', sa.Column('position_type', position_type_enum, nullable=True))
    op.execute("UPDATE order_items SET position_type = 'LONG' WHERE position_type IS NULL")
    op.alter_column('order_items', 'position_type', nullable=False)


def downgrade() -> None:
    op.drop_column('order_items', 'position_type')
    op.execute("DROP TYPE IF EXISTS position_type")

    op.drop_constraint('uq_journal_user_date', 'journals', type_='unique')

    op.create_table('journal_tags',
    sa.Column('journal_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('tag_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['journal_id'], ['journals.id'], name='journal_tags_journal_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], name='journal_tags_tag_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('journal_id', 'tag_id', name='journal_tags_pkey')
    )
    op.drop_table('order_tags')
