-- Fix PostgreSQL sequence synchronization for status_overrides table
-- This SQL script resets the sequence to the correct value

-- Get current max ID and reset sequence
SELECT setval('status_overrides_id_seq', COALESCE((SELECT MAX(id) FROM status_overrides), 0) + 1, false);

-- Verify the fix
SELECT 'Current max ID: ' || COALESCE(MAX(id), 0) as max_id FROM status_overrides;
SELECT 'Sequence value: ' || last_value as seq_value FROM status_overrides_id_seq;