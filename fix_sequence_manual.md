# Fix PostgreSQL Sequence Synchronization Issue

## Problem
The `status_overrides` table sequence is out of sync, causing IntegrityError when trying to insert new records.

## Solution
Run these SQL commands directly in your PostgreSQL database:

### Method 1: Direct SQL Commands
```sql
-- Connect to your database and run:

-- 1. Check current state
SELECT 'Current max ID: ' || COALESCE(MAX(id), 0) as max_id FROM status_overrides;
SELECT 'Current sequence: ' || last_value as seq_value FROM status_overrides_id_seq;

-- 2. Fix the sequence
SELECT setval('status_overrides_id_seq', COALESCE((SELECT MAX(id) FROM status_overrides), 0) + 1, false);

-- 3. Verify the fix
SELECT 'New sequence value: ' || last_value as new_seq_value FROM status_overrides_id_seq;
```

### Method 2: Using psql command line
```bash
# Connect to database
psql -h localhost -U showstrack -d showstrack

# Run the fix
\i fix_sequence.sql
```

### Method 3: Alternative approach - Reset sequence completely
```sql
-- If the above doesn't work, try this more aggressive approach:
ALTER SEQUENCE status_overrides_id_seq RESTART WITH 1;
UPDATE status_overrides SET id = nextval('status_overrides_id_seq');
```

## Prevention
To prevent this issue in the future, ensure that:
1. Always use SQLAlchemy's auto-increment functionality
2. Don't manually insert IDs unless absolutely necessary
3. If you must insert with specific IDs, update the sequence afterward

## Test the Fix
After running the fix, try creating a new override in your application to verify it works.