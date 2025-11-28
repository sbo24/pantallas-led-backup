import asyncio
import sys
import os
from sqlalchemy import select, and_

# Add the backend directory to the python path
sys.path.append(os.path.join(os.getcwd(), "showstrack-backend/backend"))

from app.database.session import async_session
from app.models.show import Show
from app.models.event import ScheduledEvent

async def cleanup_duplicates():
    async with async_session() as db:
        print("--- Starting Duplicate Cleanup ---")
        
        # 1. Get all shows
        result = await db.execute(select(Show))
        shows = result.scalars().all()
        
        # 2. Group by lowercase name
        shows_by_name = {}
        for show in shows:
            name_lower = show.name.lower()
            if name_lower not in shows_by_name:
                shows_by_name[name_lower] = []
            shows_by_name[name_lower].append(show)
            
        # 3. Process duplicates
        duplicates_found = 0
        for name_lower, show_list in shows_by_name.items():
            if len(show_list) > 1:
                duplicates_found += 1
                print(f"\nFound duplicates for '{name_lower}':")
                
                # Sort by ID (assuming smaller ID is the original/correct one)
                # You might want to refine this heuristic (e.g. check which one has more events, or prefer Title Case)
                # For now, we prefer the one with the smallest ID as it's likely the oldest.
                show_list.sort(key=lambda s: s.id)
                target_show = show_list[0]
                duplicate_shows = show_list[1:]
                
                print(f"  Target Show: ID {target_show.id} ('{target_show.name}')")
                
                for dup_show in duplicate_shows:
                    print(f"  Processing Duplicate: ID {dup_show.id} ('{dup_show.name}')")
                    
                    # Get events for the duplicate show
                    events_query = select(ScheduledEvent).where(ScheduledEvent.show_id == dup_show.id)
                    events = (await db.execute(events_query)).scalars().all()
                    
                    for event in events:
                        # Check if target already has this event (to avoid unique constraint violation)
                        # Constraint: show_id, event_date, start_time
                        check_query = select(ScheduledEvent).where(
                            and_(
                                ScheduledEvent.show_id == target_show.id,
                                ScheduledEvent.event_date == event.event_date,
                                ScheduledEvent.start_time == event.start_time
                            )
                        )
                        existing_target_event = (await db.execute(check_query)).scalar_one_or_none()
                        
                        if existing_target_event:
                            print(f"    - Event collision at {event.event_date} {event.start_time}. Deleting duplicate event ID {event.id}.")
                            await db.delete(event)
                        else:
                            print(f"    - Moving event ID {event.id} ({event.event_date} {event.start_time}) to target show.")
                            event.show_id = target_show.id
                            db.add(event)
                    
                    # Delete the duplicate show
                    print(f"  Deleting duplicate show ID {dup_show.id}")
                    await db.delete(dup_show)
        
        if duplicates_found > 0:
            print("\nCommitting changes...")
            await db.commit()
            print("Cleanup complete.")
        else:
            print("\nNo duplicates found.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
