export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    read: boolean;
    created_at: string;
    read_at?: string | null;
    metadata?: any;
}

export type NotificationType =
    | 'connection_request'
    | 'connection_accepted'
    | 'post_like'
    | 'post_comment'
    | 'post_mention'
    | 'post_publish'
    | 'message'
    | 'endorsement'
    | 'opportunity'
    | 'system';
