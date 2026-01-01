/**
 * Security utilities for input validation
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID format.
 * This prevents SQL injection when UUIDs are interpolated into queries.
 */
export const isValidUUID = (value: string | null | undefined): value is string => {
    if (!value) return false;
    return UUID_REGEX.test(value);
};

/**
 * Validates a UUID and throws an error if invalid.
 * Use this when you need to ensure a UUID is valid before using it.
 */
export const validateUUID = (value: string | null | undefined, fieldName = 'ID'): string => {
    if (!isValidUUID(value)) {
        throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
    }
    return value;
};

/**
 * Sanitizes a string for use in ILIKE patterns.
 * Escapes special characters that have meaning in SQL LIKE patterns.
 */
export const sanitizeSearchQuery = (query: string): string => {
    // Escape SQL LIKE special characters: %, _, \
    return query
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
};
