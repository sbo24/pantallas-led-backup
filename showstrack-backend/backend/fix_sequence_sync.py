#!/usr/bin/env python3
"""
Fix PostgreSQL sequence synchronization for status_overrides table.
This script resets the sequence to the correct value.
"""
import asyncio
import asyncpg
import os

async def fix_sequence_sync():
    """Fix the sequence synchronization issue."""
    
    # Database connection
    database_url = os.getenv('DATABASE_URL', 'postgresql://showstrack:showstrack123@localhost:5432/showstrack')
    
    # Parse URL for asyncpg
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgres://')
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Get current max ID from status_overrides table
        max_id_result = await conn.fetchval("SELECT COALESCE(MAX(id), 0) FROM status_overrides")
        max_id = max_id_result or 0
        
        print(f"Current max ID in status_overrides: {max_id}")
        
        # Get current sequence value
        seq_value = await conn.fetchval("SELECT last_value FROM status_overrides_id_seq")
        print(f"Current sequence value: {seq_value}")
        
        # Calculate new sequence value (max_id + 1)
        new_seq_value = max_id + 1
        
        if seq_value < new_seq_value:
            # Reset sequence to correct value
            await conn.execute(f"SELECT setval('status_overrides_id_seq', {new_seq_value}, false)")
            print(f"Sequence reset to: {new_seq_value}")
            
            # Verify the fix
            new_seq_value_check = await conn.fetchval("SELECT last_value FROM status_overrides_id_seq")
            print(f"Verified sequence value: {new_seq_value_check}")
        else:
            print("Sequence is already synchronized")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_sequence_sync())