"""Remove unique constraint on external_event_id for multiple events support

Revision ID: a5ff00e91e47
Revises: 4174d00fd371
Create Date: 2025-08-21 09:24:40.395017

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5ff00e91e47'
down_revision: Union[str, None] = '4174d00fd371'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove unique constraint on external_event_id to support multiple events per day
    # Use try/except in case constraint was already removed manually
    try:
        op.drop_constraint('uq_scheduled_events_external_event_id', 'scheduled_events', type_='unique')
    except Exception:
        # Constraint already removed, skip
        pass


def downgrade() -> None:
    # Re-add unique constraint if rollback is needed
    op.create_unique_constraint('uq_scheduled_events_external_event_id', 'scheduled_events', ['external_event_id'])
