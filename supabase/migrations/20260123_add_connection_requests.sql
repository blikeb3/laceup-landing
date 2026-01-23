-- Migration: Add Connection Requests Feature
-- Created: 2026-01-23
-- Description: Migrate from one-way connections to two-sided connection requests with accept/reject
--
-- This migration:
-- 1. Creates the new connection_requests table
-- 2. Sets up RLS policies for security
-- 3. Creates necessary indexes
-- 4. Creates triggers for timestamp maintenance
-- 5. Provides migration functions to move existing data

-- ===================================
-- 1. CREATE connection_requests TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_request UNIQUE(requester_id, receiver_id),
  CONSTRAINT no_self_request CHECK (requester_id != receiver_id)
);

-- ===================================
-- 2. CREATE INDEXES
-- ===================================

CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver_status 
  ON connection_requests(receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_connection_requests_requester_status 
  ON connection_requests(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_connection_requests_created_at 
  ON connection_requests(created_at DESC);

-- ===================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ===================================

ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests (as receiver or requester)
CREATE POLICY IF NOT EXISTS connection_requests_view_policy
  ON connection_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
  );

-- Policy: Users can insert requests (they are the requester)
CREATE POLICY IF NOT EXISTS connection_requests_insert_policy
  ON connection_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
  );

-- Policy: Users can update their own requests (receiver can accept/reject)
CREATE POLICY IF NOT EXISTS connection_requests_update_policy
  ON connection_requests
  FOR UPDATE
  USING (
    auth.uid() = receiver_id OR auth.uid() = requester_id
  )
  WITH CHECK (
    auth.uid() = receiver_id OR auth.uid() = requester_id
  );

-- Policy: Users can delete their own requests
CREATE POLICY IF NOT EXISTS connection_requests_delete_policy
  ON connection_requests
  FOR DELETE
  USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
  );

-- ===================================
-- 4. CREATE UPDATED_AT TRIGGER
-- ===================================

CREATE OR REPLACE FUNCTION update_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS connection_requests_updated_at_trigger ON connection_requests;

CREATE TRIGGER connection_requests_updated_at_trigger
BEFORE UPDATE ON connection_requests
FOR EACH ROW
EXECUTE FUNCTION update_connection_requests_updated_at();

-- ===================================
-- 5. MIGRATION HELPER FUNCTIONS
-- ===================================

-- Function to migrate existing one-way connections to pending requests
-- This function should be run after table creation to migrate existing data
CREATE OR REPLACE FUNCTION migrate_connections_to_requests()
RETURNS TABLE(
  requester_id UUID,
  receiver_id UUID,
  migration_type TEXT,
  status TEXT
) AS $$
DECLARE
  conn RECORD;
  mutual_exists BOOLEAN;
  migration_count INT := 0;
BEGIN
  -- Loop through all existing connections
  FOR conn IN SELECT user_id, connected_user_id FROM connections LOOP
    -- Check if mutual connection exists (reverse direction)
    SELECT EXISTS(
      SELECT 1 FROM connections 
      WHERE user_id = conn.connected_user_id 
      AND connected_user_id = conn.user_id
    ) INTO mutual_exists;

    -- If not mutual, create a pending connection request
    IF NOT mutual_exists THEN
      BEGIN
        INSERT INTO connection_requests (requester_id, receiver_id, status)
        VALUES (conn.user_id, conn.connected_user_id, 'pending')
        ON CONFLICT (requester_id, receiver_id) DO UPDATE
        SET status = 'pending', updated_at = now();
        
        RETURN QUERY 
        SELECT conn.user_id, conn.connected_user_id, 'ONE_WAY'::TEXT, 'pending'::TEXT;
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error migrating connection from % to %: %', 
          conn.user_id, conn.connected_user_id, SQLERRM;
      END;
    ELSE
      -- For mutual connections, mark the requests as accepted
      BEGIN
        INSERT INTO connection_requests (requester_id, receiver_id, status)
        VALUES (conn.user_id, conn.connected_user_id, 'accepted')
        ON CONFLICT (requester_id, receiver_id) DO UPDATE
        SET status = 'accepted', updated_at = now();
        
        RETURN QUERY 
        SELECT conn.user_id, conn.connected_user_id, 'MUTUAL'::TEXT, 'accepted'::TEXT;
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error migrating mutual connection from % to %: %', 
          conn.user_id, conn.connected_user_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE 'Connection migration completed. % records processed.', migration_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 6. HELPER FUNCTION TO CHECK MUTUAL CONNECTION
-- ===================================

-- Check if two users have a mutual connection
CREATE OR REPLACE FUNCTION check_mutual_connection(user_1 UUID, user_2 UUID)
RETURNS BOOLEAN AS $$
DECLARE
  mutual_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM connections 
    WHERE (
      (user_id = user_1 AND connected_user_id = user_2) OR
      (user_id = user_2 AND connected_user_id = user_1)
    )
    LIMIT 2
  ) AND (
    SELECT COUNT(*) FROM connections
    WHERE (user_id = user_1 AND connected_user_id = user_2)
      OR (user_id = user_2 AND connected_user_id = user_1)
  ) = 2 INTO mutual_exists;
  
  RETURN mutual_exists;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 7. HELPER FUNCTION TO GET PENDING REQUESTS
-- ===================================

-- Get all pending connection requests for a user
CREATE OR REPLACE FUNCTION get_pending_requests_for_user(user_id UUID)
RETURNS TABLE (
  request_id UUID,
  requester_id UUID,
  requester_name TEXT,
  requester_avatar UUID,
  requester_university TEXT,
  requester_skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.requester_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown User'),
    p.id,
    p.university,
    p.skills,
    cr.created_at
  FROM connection_requests cr
  LEFT JOIN profiles p ON cr.requester_id = p.id
  WHERE cr.receiver_id = user_id
  AND cr.status = 'pending'
  ORDER BY cr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- INSTRUCTIONS FOR RUNNING THIS MIGRATION
-- ===================================
/*

STEP 1: Run the migration file in Supabase SQL Editor
- Go to your Supabase Dashboard
- Navigate to SQL Editor
- Create a new query
- Copy and paste this entire file
- Click "Run"

STEP 2: Verify the migration completed
- Check that connection_requests table exists
- Check the table structure and indexes

STEP 3: Run data migration (optional, but recommended)
- Execute this in the SQL Editor after the main migration:

  SELECT * FROM migrate_connections_to_requests();

- This will migrate all existing one-way connections to pending requests
- Mutual connections will be marked as 'accepted'

STEP 4: Update the TypeScript types
- Update src/integrations/supabase/types.ts with the new table structure
- This should be done automatically if using Supabase CLI or TypeScript generator

STEP 5: Deploy the frontend code
- Update all components and pages as specified in CONNECTION_REQUEST_IMPLEMENTATION.md
- Test thoroughly before deploying to production

ROLLBACK INSTRUCTIONS (if needed):
- Drop the connection_requests table
- Drop the helper functions
- Application will revert to original connection behavior

*/

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON connection_requests TO authenticated;
GRANT SELECT ON connection_requests TO service_role;

