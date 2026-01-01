# Notification System Integration Guide

The notification system has been successfully implemented! Here's how to use it:

## What's Been Created

1. **Database Table**: `supabase/migrations/20260101000000_create_notifications.sql`
   - Complete notifications table with RLS policies
   - Indexes for optimal performance
   - Automatic timestamp handling

2. **TypeScript Types**: `src/types/notifications.ts`
   - Notification interface
   - NotificationType enum

3. **Custom Hook**: `src/hooks/useNotifications.ts`
   - Real-time notification updates
   - Mark as read/unread functionality
   - Delete notifications
   - Automatic unread count

4. **UI Component**: `src/components/NotificationsDropdown.tsx`
   - Bell icon with unread count badge
   - Dropdown with recent 20 notifications
   - Click to navigate to linked content
   - Mark all as read button

5. **Helper Functions**: `src/lib/notificationHelpers.ts`
   - Pre-built functions for common notification types
   - Easy integration into existing features

## Setup Instructions

### 1. Apply the Database Migration

Choose one method:

**Option A: Supabase CLI**
```bash
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/20260101000000_create_notifications.sql`
3. Run the SQL

### 2. Test the Implementation

After applying the migration, test with a sample notification:

```sql
-- Get your user ID first
SELECT id FROM auth.users LIMIT 1;

-- Insert a test notification (replace YOUR_USER_ID)
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
  'YOUR_USER_ID',
  'system',
  'Welcome to LaceUP!',
  'Your notification system is now active.',
  '/profile'
);
```

## How to Use Notifications in Your Features

### Example 1: Notify on Connection Request

```typescript
import { notifyConnectionRequest } from '@/lib/notificationHelpers';

// In your connection request handler
const handleSendConnectionRequest = async (recipientId: string) => {
  // Your existing logic...
  
  // Add notification
  await notifyConnectionRequest(
    recipientId,
    currentUser.name,
    currentUser.id
  );
};
```

### Example 2: Notify on Post Like

```typescript
import { notifyPostLike } from '@/lib/notificationHelpers';

const handleLikePost = async (post: Post) => {
  // Your existing like logic...
  
  // Notify the post author (don't notify if liking own post)
  if (post.author_id !== currentUser.id) {
    await notifyPostLike(
      post.author_id,
      currentUser.name,
      post.id
    );
  }
};
```

### Example 3: Notify on New Message

```typescript
import { notifyNewMessage } from '@/lib/notificationHelpers';

const handleSendMessage = async (recipientId: string, message: string) => {
  // Your existing message sending logic...
  
  // Notify recipient
  await notifyNewMessage(
    recipientId,
    currentUser.name,
    conversationId
  );
};
```

### Example 4: Custom Notification

```typescript
import { createNotification } from '@/lib/notificationHelpers';

await createNotification({
  userId: targetUserId,
  type: 'system',
  title: 'Custom Title',
  message: 'Custom message here',
  link: '/custom-link',
  metadata: { customData: 'value' }
});
```

## Features

✅ **Real-time Updates**: Notifications appear instantly without page refresh  
✅ **Unread Count Badge**: Shows number of unread notifications (up to 9+)  
✅ **Click to Navigate**: Clicking a notification navigates to related content  
✅ **Mark as Read**: Individual or bulk mark as read  
✅ **Delete**: Remove individual notifications  
✅ **Recent 20**: Always shows the 20 most recent notifications  
✅ **Secure**: Row Level Security ensures users only see their own notifications  
✅ **Optimized**: Database indexes for fast queries  

## Notification Types

- `connection_request` - Connection requests
- `connection_accepted` - Accepted connections
- `post_like` - Post likes
- `post_comment` - Post comments
- `post_mention` - Mentions in posts
- `message` - New messages
- `endorsement` - Skill endorsements
- `opportunity` - Job/opportunity matches
- `system` - System announcements

## Next Steps

1. Apply the database migration
2. Test with a sample notification
3. Integrate notification calls into your existing features:
   - Connection requests/accepts
   - Post likes and comments
   - Mentions
   - New messages
   - Endorsements
   - Opportunities

## Troubleshooting

**Notifications not appearing?**
- Check if the migration was applied successfully
- Verify RLS policies are enabled
- Check browser console for errors
- Ensure user is authenticated

**Real-time not working?**
- Check Supabase Realtime is enabled for the notifications table
- Verify your Supabase project has Realtime enabled

**Performance concerns?**
- The table has indexes for optimal performance
- Only 20 most recent notifications are loaded
- Consider archiving old notifications periodically
