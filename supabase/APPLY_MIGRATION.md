# Applying the Notification System Migration

## Quick Start

To apply the notifications database migration, follow these steps:

### Step 1: Access Your Supabase SQL Editor

1. Go to your Supabase project dashboard at https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Apply the Migration

Copy the entire contents of the file:
```
supabase/migrations/20260101000000_create_notifications.sql
```

Paste it into the SQL Editor and click "Run" or press Ctrl+Enter.

### Step 3: Verify the Migration

Run this query to verify the notifications table was created:

```sql
SELECT * FROM notifications LIMIT 1;
```

You should see an empty result (since no notifications exist yet), but no errors.

### Step 4: Test with a Sample Notification

Get your user ID and create a test notification:

```sql
-- First, get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then create a test notification (replace YOUR_USER_ID with the actual ID)
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'system',
  'Welcome to Notifications!',
  'Your notification system is now active and ready to use.',
  '/profile'
);
```

### Step 5: Check Your App

1. Refresh your LaceUP application
2. You should see a red badge with "1" on the notification bell
3. Click the bell to see your test notification
4. Click the notification to navigate to your profile

## Success! 🎉

Your notification system is now fully functional!

## Next Steps

Integrate notifications into your features:
- See `NOTIFICATIONS_SETUP.md` for integration examples
- Use the helper functions in `src/lib/notificationHelpers.ts`
- Notifications will appear in real-time without page refresh

## Troubleshooting

**"Table 'notifications' does not exist"**
- Make sure you ran the entire migration SQL
- Check for any error messages in the SQL Editor

**"Permission denied for table notifications"**
- The RLS policies should have been created by the migration
- Try running the migration again

**No notifications appearing in the UI**
- Check browser console for errors
- Verify you're logged in
- Make sure the user_id in your test notification matches your actual user ID

**Types not matching**
- The TypeScript types have been manually updated
- If you regenerate types later with `supabase gen types`, you may need to reapply the notifications type

## Alternative: Use Supabase CLI

If you prefer using the command line:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (get your project ref from the dashboard)
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Need Help?

- Check the Supabase logs in your dashboard under "Database" → "Logs"
- Review `NOTIFICATIONS_SETUP.md` for integration examples
- The notification system uses real-time subscriptions, so changes appear instantly
