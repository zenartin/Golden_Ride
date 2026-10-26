"""add radius filter

Revision ID: 2047b720a925
Revises: 1047b720a924
Create Date: 2026-10-04 00:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2047b720a925'
down_revision: Union[str, None] = '1047b720a924'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('drivers', sa.Column('radius_filter', sa.Integer(), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('drivers', 'radius_filter')
