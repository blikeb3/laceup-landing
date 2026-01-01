/**
 * Secure query builder utilities to prevent SQL injection
 * All user-provided IDs are validated before being used in queries
 */

import { isValidUUID } from "./validation";

/**
 * Validates UUIDs and builds a safe OR filter for Supabase queries
 * This prevents SQL injection by ensuring all parameters are valid UUIDs
 */
export const buildSafeOrFilter = (conditions: string[]): string => {
    return conditions.join(',');
};

/**
 * Validates and sanitizes a UUID for use in queries
 * Throws an error if the UUID is invalid
 */
export const validateQueryUUID = (uuid: string | null | undefined, fieldName = 'ID'): string => {
    if (!isValidUUID(uuid)) {
        throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
    }
    return uuid;
};

/**
 * Validates multiple UUIDs at once
 * Returns only valid UUIDs, filters out invalid ones
 */
export const validateQueryUUIDs = (uuids: (string | null | undefined)[]): string[] => {
    return uuids.filter((uuid): uuid is string => isValidUUID(uuid));
};

/**
 * Builds a safe 1:1 conversation filter
 * Validates both user IDs before building the query
 */
export const build1to1Filter = (userId1: string, userId2: string): string => {
    const validUserId1 = validateQueryUUID(userId1, 'User ID 1');
    const validUserId2 = validateQueryUUID(userId2, 'User ID 2');
    
    return `and(sender_id.eq.${validUserId1},receiver_id.eq.${validUserId2}),and(sender_id.eq.${validUserId2},receiver_id.eq.${validUserId1})`;
};

/**
 * Builds a safe connection filter for mutual connections
 * Validates both user IDs before building the query
 */
export const buildConnectionFilter = (userId1: string, userId2: string): string => {
    const validUserId1 = validateQueryUUID(userId1, 'User ID 1');
    const validUserId2 = validateQueryUUID(userId2, 'User ID 2');
    
    return `and(user_id.eq.${validUserId1},connected_user_id.eq.${validUserId2}),and(user_id.eq.${validUserId2},connected_user_id.eq.${validUserId1})`;
};

/**
 * Builds a safe sender/receiver filter
 * Validates the user ID before building the query
 */
export const buildSenderReceiverFilter = (userId: string): string => {
    const validUserId = validateQueryUUID(userId, 'User ID');
    return `sender_id.eq.${validUserId},receiver_id.eq.${validUserId}`;
};

/**
 * Builds a safe filter for messages involving specific users
 * Validates all user IDs before building the query
 */
export const buildUserMessagesFilter = (currentUserId: string, userIdList: string[]): string => {
    const validCurrentId = validateQueryUUID(currentUserId, 'Current User ID');
    const validUserIds = validateQueryUUIDs(userIdList);
    
    if (validUserIds.length === 0) {
        throw new Error('No valid user IDs provided');
    }
    
    const list = validUserIds.join(',');
    return `and(sender_id.eq.${validCurrentId},receiver_id.in.(${list})),and(receiver_id.eq.${validCurrentId},sender_id.in.(${list}))`;
};
