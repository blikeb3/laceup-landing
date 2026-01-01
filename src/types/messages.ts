export interface ConversationParticipant {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    university?: string | null;
}

export interface Conversation {
    id: string;
    name: string;
    avatar: string;
    avatarUrl?: string | null;
    role: string;
    user_role?: string | null;
    user_is_admin?: boolean;
    user_badges?: Array<{
        id: string;
        user_id: string;
        badge_id: string;
        created_at: string;
        badges: {
            id: string;
            name: string;
            description: string | null;
            icon: string | null;
            image_url: string | null;
            color_bg: string | null;
            color_text: string | null;
            is_active: boolean;
        };
    }>;
    connectionType: "mentor" | "employer" | "peer";
    lastMessage: string;
    time: string;
    lastMessageDate?: string | null;
    unread?: boolean;
    unreadCount?: number;
    isConnected: boolean;
    userId: string;
    // Group messaging fields
    threadId?: string;
    isGroup?: boolean;
    participants?: ConversationParticipant[];
    typingUsers?: string[]; // Names of users currently typing
    customName?: string | null; // Custom name set by user for group chats
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id?: string | null;
    thread_id?: string;
    sender: string;
    text: string;
    time: string;
    isOwn: boolean;
    isQuickPrompt?: boolean;
    promptType?: "mentorship" | "opportunity";
    created_at: string;
    read_at?: string | null;
    image_url?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    // System message support
    isSystemMessage?: boolean;
    systemMessageType?: "user_left" | "user_joined";
    // Message status tracking (simplified: sent or read)
    status?: "sent" | "read";
}

export interface GroupThread {
    id: string;
    thread_id: string;
    thread_name: string | null;
    members: ConversationParticipant[];
    lastMessage?: string;
    lastMessageTime?: string;
}

export interface TypingStatus {
    id: string;
    user_id: string;
    conversation_id: string;
    started_at: string;
}
