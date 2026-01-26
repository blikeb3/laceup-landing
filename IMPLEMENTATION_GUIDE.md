# Connection Request System - Implementation Guide

This guide walks you through implementing the new connection request system for LaceUp.

## System Overview

The new system transitions from one-way "follow-like" connections to a two-sided connection request model:
- Users can send connection requests to others
- Receivers can Accept or Reject requests
- Accepted requests become mutual connections
- Rejected requests are archived but visible

## Step-by-Step Implementation

### Phase 1: Database Setup (5-10 minutes)

#### Step 1.1: Apply the Database Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20260123_add_connection_requests.sql`
5. Click **Run** to execute the migration

This creates:
- `connection_requests` table with proper constraints and RLS policies
- Helper functions for data migration
- Proper indexes for performance
- Automatic timestamp triggers

#### Step 1.2: Verify Migration Success

Run this query to verify the table was created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'connection_requests';
```

You should see: `connection_requests`

### Phase 2: Migrate Existing Data (2-5 minutes)

#### Step 2.1: Run Data Migration Function

Execute this in Supabase SQL Editor:

```sql
SELECT * FROM migrate_connections_to_requests();
```

This function will:
- Convert all one-way connections to pending requests
- Mark mutual connections as accepted requests
- Preserve all existing connection data
- Display migration results

#### Step 2.2: Verify Migration Results

Check the migration statistics:

```sql
SELECT 
  status,
  COUNT(*) as count
FROM connection_requests
GROUP BY status
ORDER BY status;
```

Expected output:
```
status     | count
-----------|-------
pending    | X     (all one-way connections)
accepted   | Y     (all mutual connections)
rejected   | 0     (none yet)
```

### Phase 3: Frontend Code Updates (Already Done!)

The following files have been updated:

1. **Database Types** ✅
   - Updated `src/integrations/supabase/types.ts` with `connection_requests` table

2. **Components** ✅
   - Created `src/components/PendingRequests.tsx` - Manages pending request display and actions

3. **Pages** ✅
   - Updated `src/pages/UserProfile.tsx` - Shows request status and buttons
   - Updated `src/pages/MyHub.tsx` - Updated connection logic
   - Updated `src/pages/Home.tsx` - Updated connection logic

4. **Routing** ✅
   - Added `/pending-requests` route in `src/App.tsx`

### Phase 4: Testing (10-15 minutes)

#### Test Scenario 1: Send a Connection Request

1. Sign in as User A
2. Go to another user's profile (User B)
3. Click **Connect** button
4. Verify:
   - Button changes to "Pending..."
   - User B receives notification
   - Connection count doesn't change yet

#### Test Scenario 2: Accept a Connection Request

1. Sign in as User B
2. Go to `/pending-requests` page (or click pending notification)
3. See User A's pending request
4. Click **Accept**
5. Verify:
   - Request is removed from pending list
   - User A receives "Connection Accepted" notification
   - Both users can see mutual connection

#### Test Scenario 3: Reject a Connection Request

1. Sign in as User B
2. Go to `/pending-requests` page
3. See pending request
4. Click **Reject**
5. Verify:
   - Request is removed from pending list
   - Users are NOT connected

#### Test Scenario 4: Cancel Sent Request

1. Sign in as User A with a pending request
2. Go to User B's profile
3. Click **Pending...** button
4. Verify:
   - Request is cancelled
   - Can click Connect again

#### Test Scenario 5: Existing Mutual Connections

1. Check a pair of users who already had mutual connections
2. Verify:
   - Both still see connection as active
   - No pending requests between them
   - Connection works as before

### Phase 5: Navigation & UI Updates

#### Update Navigation Menu (Optional Enhancement)

You may want to add a link to pending requests in the Navigation component. Add this:

```tsx
<NavLink to="/pending-requests" label="Pending Requests" badge={pendingCount} />
```

#### Update Profile Page

Consider adding a pending requests count badge on the user's profile:

```tsx
<Badge>{pendingRequestCount} pending request{pendingRequestCount !== 1 ? 's' : ''}</Badge>
```

## Feature Summary

### For Senders
- Send connection request: Click **Connect** button
- Cancel request: Click **Pending...** button
- Disconnect from mutual connection: Click **Disconnect** button

### For Receivers
- View pending requests: Go to `/pending-requests` page
- Accept request: Click **Accept** button → Becomes mutual connection
- Reject request: Click **Reject** button → Removed from pending
- See pending sender info: Profile picture, name, university, skills

### Visual Indicators

| State | Button Text | Color |
|-------|------------|-------|
| No connection | "Connect" | Gold |
| Request sent | "Pending..." | Gray/Outline |
| Request received | "Accept" / "Reject" | Gold / Outline |
| Connected | "Disconnect" | Outline |

## Notification Types

The system uses these existing notification types:

1. **connection_request**: Sent when someone requests to connect
2. **connection_accepted**: Sent when a request is accepted

Both notifications:
- Direct users to relevant profiles
- Include sender/accepter information
- Appear in the notifications dropdown

## API Endpoints Used

All operations use these Supabase tables:

```
connection_requests
├── id (UUID)
├── requester_id (references auth.users)
├── receiver_id (references auth.users)
├── status ('pending' | 'accepted' | 'rejected')
├── created_at (timestamp)
└── updated_at (timestamp)

connections (unchanged)
├── id (UUID)
├── user_id (references auth.users)
├── connected_user_id (references auth.users)
└── created_at (timestamp)
```

## Database Security

All operations are protected by Row Level Security (RLS):

- Users can only view their own requests (sent or received)
- Users can only create requests as the requester
- Only the receiver can accept/reject
- Deletes are only allowed by the requester or receiver

## Performance Considerations

- Indexes on `(receiver_id, status)` for fast pending queries
- Indexes on `(requester_id, status)` for outgoing request tracking
- Auto-maintained `updated_at` timestamp via trigger

## Rollback Instructions

If you need to rollback (NOT recommended after users interact):

1. Delete the `connection_requests` table:
   ```sql
   DROP TABLE IF EXISTS connection_requests CASCADE;
   ```

2. Revert the frontend code changes (git checkout)

3. Application will use only the original `connections` table

## Migration Notes

### Data Preservation
- ✅ All existing connections preserved
- ✅ Mutual connections remain active
- ✅ One-way connections become pending requests
- ✅ No data loss

### User Experience
- ✅ Existing mutual connections work unchanged
- ✅ New requests follow new workflow
- ✅ Clear visual distinction between states
- ✅ Notifications keep users informed

## Troubleshooting

### Issue: "Connection already exists" error
**Cause**: Trying to create duplicate request
**Solution**: This is prevented by unique constraint. User should see "Pending..." instead.

### Issue: Pending requests not showing
**Cause**: Supabase types not updated or cached data
**Solution**: Clear browser cache, hard refresh (Ctrl+Shift+R)

### Issue: Mutual connections broken after migration
**Cause**: Data migration didn't run correctly
**Solution**: 
1. Check migration function output
2. Manually run: `SELECT * FROM migrate_connections_to_requests();`
3. Verify results with counting queries

### Issue: Notifications not sent
**Cause**: notifyConnectionRequest function issue
**Solution**: Check browser console for errors, verify notification settings in profile

## Support Commands

Useful SQL queries for debugging:

```sql
-- View all pending requests for a user
SELECT * FROM connection_requests 
WHERE receiver_id = 'USER_ID' AND status = 'pending';

-- View all sent requests
SELECT * FROM connection_requests 
WHERE requester_id = 'USER_ID' AND status = 'pending';

-- Check mutual connections between two users
SELECT EXISTS(
  SELECT 1 FROM connections 
  WHERE user_id = 'USER_1' AND connected_user_id = 'USER_2'
) AND EXISTS(
  SELECT 1 FROM connections 
  WHERE user_id = 'USER_2' AND connected_user_id = 'USER_1'
);

-- Count pending requests for all users
SELECT receiver_id, COUNT(*) as pending_count
FROM connection_requests
WHERE status = 'pending'
GROUP BY receiver_id;
```

## Timeline

- **Database migration**: 5-10 minutes
- **Data migration**: 2-5 minutes (depending on data size)
- **Testing**: 10-15 minutes
- **Deployment**: Immediate (frontend code already updated)
- **Total**: ~30 minutes

## Next Steps

1. ✅ Apply database migration
2. ✅ Run data migration function
3. ✅ Test all scenarios (see Testing section)
4. ✅ Monitor for any issues
5. ✅ (Optional) Add UI enhancements

## Documentation Files

- `CONNECTION_REQUEST_IMPLEMENTATION.md` - Detailed implementation plan
- `DATA_MIGRATION_GUIDE.md` - Data migration procedures
- `IMPLEMENTATION_GUIDE.md` - This file
- `supabase/migrations/20260123_add_connection_requests.sql` - Database migration

---

For questions or issues, refer to the detailed guides in the project root directory.

