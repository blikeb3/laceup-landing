import { supabase } from '@/integrations/supabase/client';
import { NotificationType } from '@/types/notifications';

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 * @param params - Notification parameters
 * @returns The created notification or null if failed
 */
export const createNotification = async (params: CreateNotificationParams) => {
    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('Auth error:', authError);
            return null;
        }

        if (!user) {
            console.error('No authenticated user found');
            return null;
        }

        // Use RPC function to bypass RLS for insert
        const { data, error } = await supabase
            .rpc('create_notification', {
                p_user_id: params.userId,
                p_type: params.type,
                p_title: params.title,
                p_message: params.message,
                p_link: params.link || null,
                p_metadata: params.metadata || {}
            });

        if (error) {
            console.error('RPC error:', error);
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Create multiple notifications at once
 * @param notifications - Array of notification parameters
 * @returns The created notifications or empty array if failed
 */
export const createBulkNotifications = async (notifications: CreateNotificationParams[]) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert(
                notifications.map(n => ({
                    user_id: n.userId,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    link: n.link || null,
                    metadata: n.metadata || {},
                    read: false,
                }))
            )
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return [];
    }
};

// Example usage helpers for common notification types

export const notifyConnectionRequest = async (recipientId: string, senderName: string, senderId: string) => {
    return createNotification({
        userId: recipientId,
        type: 'connection_request',
        title: 'New Connection Request',
        message: `${senderName} wants to connect with you`,
        link: `/profile/${senderId}`,
        metadata: { senderId, senderName },
    });
};

export const notifyConnectionAccepted = async (recipientId: string, accepterName: string, accepterId: string) => {
    return createNotification({
        userId: recipientId,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        message: `${accepterName} accepted your connection request`,
        link: `/profile/${accepterId}`,
        metadata: { accepterId, accepterName },
    });
};

export const notifyPostLike = async (postAuthorId: string, likerName: string, postId: string) => {
    return createNotification({
        userId: postAuthorId,
        type: 'post_like',
        title: 'Post Liked',
        message: `${likerName} liked your post`,
        link: `/home?post=${postId}`,
        metadata: { postId, likerName },
    });
};

export const notifyPostComment = async (postAuthorId: string, commenterName: string, postId: string) => {
    return createNotification({
        userId: postAuthorId,
        type: 'post_comment',
        title: 'New Comment',
        message: `${commenterName} commented on your post`,
        link: `/home?post=${postId}`,
        metadata: { postId, commenterName },
    });
};

export const notifyPostMention = async (mentionedUserId: string, mentionerName: string, postId: string) => {
    return createNotification({
        userId: mentionedUserId,
        type: 'post_mention',
        title: 'You Were Mentioned',
        message: `${mentionerName} mentioned you in a post`,
        link: `/home?post=${postId}`,
        metadata: { postId, mentionerName },
    });
};

export const notifyNewMessage = async (recipientId: string, senderName: string, conversationId: string) => {
    return createNotification({
        userId: recipientId,
        type: 'message',
        title: 'New Message',
        message: `${senderName} sent you a message`,
        link: `/messages?conversation=${conversationId}`,
        metadata: { conversationId, senderName },
    });
};

export const notifyEndorsement = async (recipientId: string, endorserName: string, skillName: string) => {
    return createNotification({
        userId: recipientId,
        type: 'endorsement',
        title: 'New Endorsement',
        message: `${endorserName} endorsed your ${skillName} skill`,
        link: `/profile`,
        metadata: { endorserName, skillName },
    });
};

export const notifyOpportunity = async (userId: string, opportunityTitle: string, opportunityId: string) => {
    return createNotification({
        userId: userId,
        type: 'opportunity',
        title: 'New Opportunity',
        message: `A new opportunity matches your profile: ${opportunityTitle}`,
        link: `/opportunities?id=${opportunityId}`,
        metadata: { opportunityId, opportunityTitle },
    });
};

export const notifySystem = async (userId: string, title: string, message: string, link?: string) => {
    return createNotification({
        userId: userId,
        type: 'system',
        title: title,
        message: message,
        link: link,
    });
};
export const notifyFollowersAboutPost = async (postAuthorId: string, authorName: string, postId: string, postPreview: string) => {
    try {
        // Get all users who follow this author (users connected to the post author)
        const { data: followers, error: followersError } = await supabase
            .from('connections')
            .select('user_id')
            .eq('connected_user_id', postAuthorId);

        if (followersError) {
            console.error('Error fetching followers:', followersError);
            return;
        }

        if (!followers || followers.length === 0) {
            return; // No followers to notify
        }

        const followerIds = followers.map(f => f.user_id);

        // Create notifications for all followers
        const notifications = followerIds.map(followerId => ({
            userId: followerId,
            type: 'post_publish' as NotificationType,
            title: 'New Post from Connection',
            message: `${authorName} shared: "${postPreview.substring(0, 50)}${postPreview.length > 50 ? '...' : ''}"`,
            link: `/home?post=${postId}`,
            metadata: { postId, authorId: postAuthorId, authorName },
        }));

        await createBulkNotifications(notifications);
    } catch (error) {
        console.error('Error notifying followers about post:', error);
    }
};