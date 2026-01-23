# Data Migration Script for Connection Requests

This script guides you through the safe migration of existing connections to the new connection request system.

## Prerequisites

1. Backup your database (highly recommended)
2. The `20260123_add_connection_requests.sql` migration has been applied
3. You have access to Supabase SQL Editor

## Migration Steps

### Step 1: Verify Database State

Run this query to see how many connections you have:

```sql
SELECT COUNT(*) as total_connections FROM connections;
```

Expected output: A single number showing total connections in the system.

### Step 2: Analyze Connection Types

This query shows you the breakdown of mutual vs one-way connections:

```sql
WITH connection_pairs AS (
  SELECT 
    user_id,
    connected_user_id,
    EXISTS(
      SELECT 1 FROM connections c2 
      WHERE c2.user_id = c1.connected_user_id 
      AND c2.connected_user_id = c1.user_id
    ) as has_reverse
  FROM connections c1
)
SELECT
  CASE 
    WHEN has_reverse THEN 'MUTUAL'
    ELSE 'ONE_WAY'
  END as connection_type,
  COUNT(*) as count
FROM connection_pairs
GROUP BY connection_type;
```

Expected output: Shows count of mutual vs one-way connections.

### Step 3: Run Migration Function

Execute the main migration function:

```sql
SELECT * FROM migrate_connections_to_requests();
```

This will:
- Create pending connection requests for all one-way connections
- Mark mutual connections as accepted
- Display progress and any errors

### Step 4: Verify Migration Results

Check that all requests were created:

```sql
SELECT 
  status,
  COUNT(*) as count
FROM connection_requests
GROUP BY status
ORDER BY status;
```

Expected output:
- pending: Count of one-way connections migrated
- accepted: Count of mutual connections migrated

### Step 5: Validate Data Integrity

Run this query to ensure no data loss:

```sql
WITH migrated AS (
  SELECT COUNT(*) as count FROM connection_requests
),
original AS (
  SELECT COUNT(*) as count FROM connections
)
SELECT 
  (SELECT count FROM original) as original_connections,
  (SELECT count FROM migrated) as migrated_requests,
  CASE 
    WHEN (SELECT count FROM migrated) >= (SELECT count FROM original) THEN 'PASSED'
    ELSE 'FAILED'
  END as validation_status;
```

Expected output: migrated_requests should be equal to or greater than original_connections

### Step 6: Test the System

Test with a few users to make sure everything works:

```sql
-- Get pending requests for a specific user
SELECT * FROM get_pending_requests_for_user('USER_ID_HERE');

-- Check a mutual connection
SELECT * FROM check_mutual_connection('USER_ID_1', 'USER_ID_2');
```

## Monitoring After Migration

After deploying the new frontend code, monitor:

1. **Connection Notifications**: Ensure users receive proper notifications
2. **Pending Requests**: Verify the pending requests view shows correct data
3. **Connection Counts**: Check that profile connection counts are accurate
4. **Mutual Connections**: Verify visual indicators for mutual connections work

## Rollback Procedure

If something goes wrong, you can rollback:

```sql
-- Clear all migrated requests
DELETE FROM connection_requests;

-- The original connections table remains unchanged
-- Application will revert to original behavior
```

Then redeploy the old frontend code.

## Common Issues

### Issue: Migration function not found
**Solution**: Make sure the SQL migration file has been applied first.

### Issue: Duplicate key errors
**Solution**: The unique constraint ensures no duplicates. Check existing data manually if needed.

### Issue: Some requests not migrated
**Solution**: Check the warning messages from the migration function output. May need manual review of those specific connections.

## Data Preservation

All existing connections are preserved:

1. **Mutual Connections** (A ↔ B)
   - Remain in connections table
   - Marked as 'accepted' in connection_requests
   - Both users can see the connection

2. **One-Way Connections** (A → B only)
   - Moved to connection_requests as 'pending'
   - B will see it as a pending request
   - Can accept or reject
   - If accepted, bidirectional connection created

## Timeline

- Migration: ~5 minutes for typical database (depends on connection count)
- Frontend updates: Deploy new code
- Monitoring: Check logs and user feedback for 24 hours

## Support

If you encounter any issues:
1. Check the migration output for specific errors
2. Review the Supabase logs
3. Check the browser console for frontend errors
4. Test with specific user scenarios

