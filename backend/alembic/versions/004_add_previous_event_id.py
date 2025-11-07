"""Add previous_event_id to events table for sequential flow tracking.

Revision ID: 004
Revises: 003
Create Date: 2025-01-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add previous_event_id column to events table."""
    op.add_column(
        'events',
        sa.Column('previous_event_id', sa.String(36), nullable=True)
    )

    # Add index for previous_event_id
    op.create_index(
        'idx_event_previous_event_id',
        'events',
        ['previous_event_id']
    )


def downgrade() -> None:
    """Remove previous_event_id column from events table."""
    op.drop_index('idx_event_previous_event_id', table_name='events')
    op.drop_column('events', 'previous_event_id')
