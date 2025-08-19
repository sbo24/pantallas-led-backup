#!/usr/bin/env python3
"""
Fix sequence sync issue for status_overrides table using SQLAlchemy.
"""
from sqlalchemy import create_engine, text

def fix_sequence():
    """Fix the sequence synchronization issue."""
    
    # Database URL - adjust if needed
    database_url = 'postgresql://showstrack:showstrack123@localhost:5432/showstrack'
    
    # Create synchronous engine for this operation
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            # Get current max ID
            result = conn.execute(text("SELECT COALESCE(MAX(id), 0) FROM status_overrides"))
            max_id = result.scalar()
            
            print(f"Current max ID in status_overrides: {max_id}")
            
            # Reset sequence to max_id + 1
            new_seq_value = max_id + 1
            conn.execute(text(f"SELECT setval('status_overrides_id_seq', {new_seq_value}, false)"))
            conn.commit()
            
            print(f"Sequence reset to: {new_seq_value}")
            
            # Verify
            result = conn.execute(text("SELECT last_value FROM status_overrides_id_seq"))
            seq_value = result.scalar()
            print(f"Verified sequence value: {seq_value}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        engine.dispose()

if __name__ == "__main__":
    fix_sequence()