-- Migration: Migrate Existing Connections to Connection Requests
-- Created: 2026-01-24
-- Description: Direct SQL to migrate data from connections table to connection_requests table
-- 
-- NOTE: Only run this if you have an existing connections table
-- This file contains the raw SQL logic extracted from the migrate_connections_to_requests() function

-- Check if connections table exists
-- If it doesn't exist, this script will fail at the first SELECT statement (which is fine)

-- Step 1: Migrate one-way connections as pending requests
INSERT INTO connection_requests (requester_id, receiver_id, status, created_at)
SELECT 
  c.user_id,
  c.connected_user_id,
  'pending'::TEXT,
  now()
FROM connections c
WHERE NOT EXISTS (
  SELECT 1 FROM connections c2
  WHERE c2.user_id = c.connected_user_id 
  AND c2.connected_user_id = c.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM connection_requests cr
  WHERE cr.requester_id = c.user_id
  AND cr.receiver_id = c.connected_user_id
)
ON CONFLICT (requester_id, receiver_id) DO UPDATE
SET status = 'pending', updated_at = now();

-- Step 2: Migrate mutual connections as accepted requests
INSERT INTO connection_requests (requester_id, receiver_id, status, created_at)
SELECT 
  c.user_id,
  c.connected_user_id,
  'accepted'::TEXT,
  now()
FROM connections c
WHERE EXISTS (
  SELECT 1 FROM connections c2
  WHERE c2.user_id = c.connected_user_id 
  AND c2.connected_user_id = c.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM connection_requests cr
  WHERE cr.requester_id = c.user_id
  AND cr.receiver_id = c.connected_user_id
)
ON CONFLICT (requester_id, receiver_id) DO UPDATE
SET status = 'accepted', updated_at = now();

-- Step 3: Verify migration
SELECT 
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_count
FROM connection_requests;
