import asyncio
import sys
import os
from sqlalchemy import select, func

# Add the backend directory to the python path
sys.path.append(os.path.join(os.getcwd(), "showstrack-backend/backend"))

from app.database.session import async_session
from app.models.show import Show
from app.models.event import ScheduledEvent

async def list_duplicates():
    print(f"DEBUG: DATABASE_URL='{os.getenv('DATABASE_URL')}'")
    async with async_session() as db:
        print("--- Checking for 'Tambor' Shows ---")
        result = await db.execute(select(Show).where(Show.name.ilike("%tambor%")))
        shows = result.scalars().all()
        
        for show in shows:
            # Count events
            event_count = await db.scalar(select(func.count()).where(ScheduledEvent.show_id == show.id))
            print(f"ID: {show.id}, Name: '{show.name}', Events: {event_count}, Created: {show.created_at}")

if __name__ == "__main__":
    asyncio.run(list_duplicates())
