# Connection Request System Implementation Plan

## Overview
This document outlines the migration from a one-way follow/connection system to a two-sided connection request system with accept/reject functionality.

## Current System
- **Table**: `connections` (user_id, connected_user_id)
- **Model**: One-way connections (A → B creates a one-way connection)
- **Notification Types**: `connection_request` and `connection_accepted`
- **Current Behavior**: When user A connects to user B:
  - If B hasn't connected to A yet: sends `connection_request` notification to B
  - If B has already connected to A: sends `connection_accepted` notification to A

## New System Architecture

### Database Changes

#### New Table: `connection_requests`
```sql
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);
```

#### Updated: `connections` Table
The existing `connections` table will be preserved for mutual connections only.
- Will store only **accepted** and **mutual** connections
- Structure remains: (user_id, connected_user_id, created_at, id)

### Data Migration Strategy

#### Phase 1: Create New Tables and Triggers
1. Create `connection_requests` table
2. Create RLS policies for `connection_requests`
3. Create indexes for performance
4. Create triggers for `updated_at` timestamp

#### Phase 2: Migrate Existing Data
For each existing one-way connection (A → B):
1. Check if B also has a connection back to A
2. **If mutual** (A ↔ B): Keep in `connections` table, mark as complete
3. **If one-way** (A → B only): Create pending `connection_request` from A to B

#### Phase 3: Application Updates
1. Update `UserProfile.tsx` connection logic
2. Update `MyHub.tsx` connection logic
3. Create `PendingRequests.tsx` component
4. Update notification helpers
5. Update contact privacy logic to use both tables

### Key Features

#### 1. Request Handling
- User can send connection request to another user
- Receiver gets `connection_request` notification
- Receiver can Accept (creates mutual connection) or Reject

#### 2. Accept Request
- Creates bidirectional connection in `connections` table
- Sends `connection_accepted` notification to requester
- Updates request status to 'accepted'

#### 3. Reject Request
- Sets request status to 'rejected'
- Does NOT create connection
- Request is visible but inactive

#### 4. Pending Requests View
- Shows all pending requests for current user
- Displays sender profile info, name, skills
- Quick Accept/Reject buttons
- Shows request creation date

#### 5. Mutual Connection Indicators
- On profile views: Show if connection is mutual
- In pending requests: Show request status
- Visual distinction between pending, accepted, mutual

### Implementation Checklist

#### Backend/Database
- [ ] Create `connection_requests` table with proper constraints
- [ ] Create RLS policies for `connection_requests`
- [ ] Create indexes on (requester_id, status), (receiver_id, status)
- [ ] Create triggers for updated_at
- [ ] Create data migration function

#### Frontend - Components
- [ ] Create `PendingRequests.tsx` component with list view
- [ ] Create request action dialog for Accept/Reject
- [ ] Update notification badges to show pending request count
- [ ] Add pending requests to navigation

#### Frontend - Pages
- [ ] Update `UserProfile.tsx`:
  - Change "Connect" button behavior
  - Show "Pending" state if request sent
  - Show "Reject/Accept" buttons if request received
  - Indicate mutual connections differently
- [ ] Update `MyHub.tsx`:
  - Update connection logic for request model
  - Update disconnect to handle pending requests
  - Update suggestions filtering
- [ ] Update `Profile.tsx`:
  - Show pending requests count
  - Link to pending requests view

#### Frontend - Hooks & Utils
- [ ] Update `notificationHelpers.ts` for new flow
- [ ] Update `contactPrivacy.ts` to check both tables
- [ ] Update `secureQuery.ts` if needed
- [ ] Update any connection-related queries

#### Testing
- [ ] Test sending connection request
- [ ] Test accepting connection request
- [ ] Test rejecting connection request
- [ ] Test mutual connections
- [ ] Test pending requests view
- [ ] Test notifications
- [ ] Test contact privacy with mixed states
- [ ] Test migration of existing data

### Files to Modify

1. **Database Schema**
   - Create new migration file

2. **TypeScript Types**
   - `src/integrations/supabase/types.ts` - Update Database type

3. **Components**
   - `src/components/NotificationsDropdown.tsx` - Show pending requests
   - NEW: `src/components/PendingRequests.tsx`
   - `src/components/ui/` - May need new UI components

4. **Pages**
   - `src/pages/UserProfile.tsx` - Major updates
   - `src/pages/MyHub.tsx` - Major updates
   - `src/pages/Profile.tsx` - Show pending requests count
   - NEW: `src/pages/PendingRequests.tsx` - View all pending requests

5. **Utilities & Hooks**
   - `src/lib/notificationHelpers.ts` - New notification flow
   - `src/lib/contactPrivacy.ts` - Check both tables
   - `src/hooks/useNotifications.ts` - Include pending count

### Migration Data Preservation

```
Current State → New State Mapping:

1. Mutual Connections (A ↔ B)
   Before: Two entries in connections table
     - connections(user_id: A, connected_user_id: B)
     - connections(user_id: B, connected_user_id: A)
   After: Two entries in connections table (SAME)
     - connections(user_id: A, connected_user_id: B)
     - connections(user_id: B, connected_user_id: A)
   + connection_requests records updated to 'accepted'

2. One-Way Connections (A → B only)
   Before: Single entry in connections table
     - connections(user_id: A, connected_user_id: B)
   After: Pending request entry
     - connection_requests(requester_id: A, receiver_id: B, status: 'pending')
     - No entry in connections table
   + Notification sent to B about pending request
```

### Backward Compatibility
- All existing mutual connections are preserved
- One-way connections become pending requests
- All endpoints remain accessible
- No data is lost

### Performance Considerations
- Index on (receiver_id, status) for fast pending request queries
- Index on (requester_id, receiver_id) for uniqueness checks
- Updated_at timestamp automatically maintained by trigger
- Connection count queries may need optimization

### Rollback Plan
If needed:
1. Keep old connections table intact
2. Only update application logic
3. Can revert to old behavior without data loss
4. Migration script can be re-run in reverse

---

## Timeline
1. **Week 1**: Database schema + migration script
2. **Week 2**: Core component updates (UserProfile, MyHub)
3. **Week 3**: Pending requests view + refinements
4. **Week 4**: Testing + bug fixes + deployment

---

## Notes
- Notifications system already supports `connection_request` and `connection_accepted` types
- Contact privacy logic will need updates to check both tables
- Messaging system dependencies on connections table will be verified
- Group functionality not affected

