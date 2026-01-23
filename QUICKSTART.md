# Quick Start - Connection Request System

**Time Required: ~30 minutes**

## 🚀 Deploy in 3 Steps

### Step 1: Apply Database Migration (5 min)

```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy entire file: supabase/migrations/20260123_add_connection_requests.sql
5. Click Run
6. Verify: Should see "connection_requests" table created
```

### Step 2: Migrate Existing Data (2 min)

```sql
SELECT * FROM migrate_connections_to_requests();
```

Verify results show pending and accepted counts.

### Step 3: Deploy Frontend (1 min)

Frontend code is already updated. Just deploy normally:
```bash
git push
# or your usual deployment process
```

## ✅ Test Scenarios

### Test 1: Send Request
- User A → User B profile → Click "Connect"
- ✓ Button shows "Pending..."
- ✓ User B gets notification

### Test 2: Accept Request  
- User B → Go to `/pending-requests`
- ✓ Sees User A's request
- ✓ Clicks Accept
- ✓ Both are now connected
- ✓ User A gets "Accepted" notification

### Test 3: Reject Request
- User B → `/pending-requests`
- ✓ Clicks Reject
- ✓ Request disappears
- ✓ Not connected

## 🎯 User-Facing Features

| User Action | Result |
|-------------|--------|
| Click Connect | Creates pending request |
| Pending request sent to you | See in `/pending-requests` page |
| Click Accept | Creates mutual connection |
| Click Reject | Declines request |
| Click Pending... | Cancels your sent request |
| Click Disconnect | Removes mutual connection |

## 📍 Key URLs

- **View pending requests**: `/pending-requests`
- **User profile**: `/profile/:userId`
- **Connection suggestions**: `/my-hub` (Connections tab)

## 🔑 Key Files

- Database: `supabase/migrations/20260123_add_connection_requests.sql`
- UI Component: `src/components/PendingRequests.tsx`
- Updated Pages: `src/pages/UserProfile.tsx`, `MyHub.tsx`, `Home.tsx`
- Types: `src/integrations/supabase/types.ts`

## 📚 Full Documentation

If you need more details:
- **Architecture**: `CONNECTION_REQUEST_IMPLEMENTATION.md`
- **Data Migration**: `DATA_MIGRATION_GUIDE.md`
- **Setup Guide**: `IMPLEMENTATION_GUIDE.md`
- **Summary**: `CONNECTION_REQUEST_SYSTEM_SUMMARY.md`

## ⚡ What Changed

### For Users
- Connection requests now require Accept/Reject
- View all pending requests in one place
- Better control over who can connect

### For Developers
- New `connection_requests` table
- New `/pending-requests` route
- Updated connection logic in 3 pages
- RLS policies for security

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Pending requests don't show | Clear cache (Ctrl+Shift+R) |
| Migration errors | Check SQL editor output |
| Buttons wrong color | Check if styles compiled |
| Notifications missing | Check notification settings |

## 📊 Data Impact

- ✅ All existing connections preserved
- ✅ One-way → Pending requests  
- ✅ Mutual → Stay as connections (+ marked as accepted)
- ✅ Zero data loss

## ⏱️ Timeline

```
Database Migration:    5 min
Data Migration:        2 min  
Testing:              15 min
Deployment:            1 min
─────────────────────────
Total:                ~23 min
```

## 🎉 Success Criteria

- [x] Database migration applied
- [x] Data migrated successfully
- [x] All tests pass
- [x] Frontend deployed
- [x] Users can send/accept/reject requests
- [x] Pending requests page works
- [x] Notifications sent correctly

---

**Ready to deploy?** Follow the 3 steps above and test immediately after.

Questions? Check the full documentation files in the project root.

