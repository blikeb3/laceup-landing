// Shared types for posts and related entities

/**
 * Badge type definition from the badges table
 */
export interface BadgeType {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    image_url: string | null;
    color_bg: string | null;
    color_text: string | null;
    is_active: boolean;
}

/**
 * User badge assignment with badge details (nested structure from DB join)
 */
export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    created_at: string;
    badges: BadgeType;
}

/**
 * Flattened user badge for simpler display purposes
 */
export interface FlattenedUserBadge {
    id: string;
    name: string;
    description?: string;
    image_url?: string | null;
    icon?: string | null;
}

/**
 * Basic profile info used in posts and comments
 */
export interface ProfileInfo {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
}

/**
 * Post media item
 */
export interface PostMedia {
    id?: string;
    media_url: string;
    media_type: string;
    display_order?: number;
}

/**
 * Post like record
 */
export interface PostLike {
    id: string;
    user_id: string;
}

/**
 * Post bookmark record
 */
export interface PostBookmark {
    id: string;
    user_id: string;
}

/**
 * Post share record
 */
export interface PostShare {
    id: string;
}

/**
 * Raw comment data from database (before role enrichment)
 */
export interface RawPostComment {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: ProfileInfo | null;
}

/**
 * Comment with user role and badge information
 */
export interface PostComment extends RawPostComment {
    user_role: string | null;
    user_is_admin: boolean;
    user_badges: UserBadge[];
}

/**
 * Raw post structure returned directly from database queries (before enrichment)
 */
export interface RawPost {
    id: string;
    user_id: string;
    content: string;
    media_url: string | null;
    media_type: string | null;
    scheduled_at: string | null;
    published_at: string;
    created_at: string;
    profiles: ProfileInfo | null;
    post_likes: PostLike[];
    post_comments: RawPostComment[];
    post_bookmarks: PostBookmark[];
    post_shares: PostShare[];
    post_media?: PostMedia[];
}

/**
 * Enriched post structure with user role and badge information
 */
export interface Post extends RawPost {
    post_comments: PostComment[];
    user_role?: string | null;
    user_is_admin?: boolean;
    user_badges?: UserBadge[];
}

/**
 * Post insert data for creating new posts
 */
export interface PostInsert {
    user_id: string;
    content: string;
    media_url?: string | null;
    media_type?: string | null;
    is_published?: boolean;
    scheduled_at?: string | null;
    published_at?: string | null;
}

/**
 * Media image for post media viewer
 */
export interface PostMediaImage {
    url: string;
    media_type: string;
}
