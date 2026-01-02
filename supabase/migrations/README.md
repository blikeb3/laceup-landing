# Notifications Feature

This directory contains the database migration for the notifications feature.

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)

1. If you haven't already, install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project (if not already linked):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the migration:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `20260101000000_create_notifications.sql`
4. Paste and run the SQL in the editor

### Option 3: Manual SQL Execution

Copy and execute the SQL from the migration file directly in your Supabase SQL editor or any PostgreSQL client connected to your database.

## What the Migration Creates

- **notifications table**: Stores all user notifications
- **RLS Policies**: Ensures users can only see and manage their own notifications
- **Indexes**: Optimizes query performance for common notification queries
- **Trigger**: Automatically updates the `read_at` timestamp when marking notifications as read

## Notification Types

The system supports the following notification types:
- `connection_request`: When someone sends a connection request
- `connection_accepted`: When someone accepts your connection request
- `post_like`: When someone likes your post
- `post_comment`: When someone comments on your post
- `post_mention`: When someone mentions you in a post
- `message`: When you receive a new message
- `endorsement`: When someone endorses your skills
- `opportunity`: When a new opportunity matches your profile
- `system`: System-wide announcements

## Testing the Feature

After applying the migration, you can test by manually inserting a notification:

```sql
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'system',
  'Welcome to LaceUP!',
  'Your account has been successfully created.',
  '/profile'
);
```

Replace `YOUR_USER_ID` with your actual user ID from the auth.users table.
