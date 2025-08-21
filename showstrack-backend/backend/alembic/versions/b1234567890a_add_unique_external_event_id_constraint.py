"""Add unique constraint on external_event_id for duplicate prevention

Revision ID: b1234567890a
Revises: a5ff00e91e47
Create Date: 2025-08-21 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1234567890a'
down_revision: Union[str, None] = 'a5ff00e91e47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unique constraint on external_event_id to prevent duplicates
    op.create_unique_constraint('unique_external_event_id', 'scheduled_events', ['external_event_id'])


def downgrade() -> None:
    # Remove unique constraint if rollback is needed
    op.drop_constraint('unique_external_event_id', 'scheduled_events', type_='unique')