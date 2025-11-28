import asyncio
import sys
import os
from sqlalchemy import select

# Add the backend directory to the python path
sys.path.append(os.path.join(os.getcwd(), "showstrack-backend/backend"))

from app.database.session import async_session
from app.models.show import Show

async def list_shows():
    async with async_session() as db:
        print("--- Listing All Shows ---")
        result = await db.execute(select(Show))
        shows = result.scalars().all()
        for show in shows:
            print(f"ID: {show.id}, Name: '{show.name}', Visible: {show.is_visible}")
            
        print("\n--- Checking for 'Tambor' ---")
        for show in shows:
            if "tambor" in show.name.lower():
                 print(f"MATCH: ID: {show.id}, Name: '{show.name}'")

if __name__ == "__main__":
    asyncio.run(list_shows())
