/**
 * Client-side rate limiting utility
 * Provides throttling for sensitive operations to prevent abuse
 */

interface RateLimitEntry {
    attempts: number;
    firstAttempt: number;
    blockedUntil: number | null;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
    maxAttempts: number;      // Maximum attempts allowed
    windowMs: number;         // Time window in milliseconds
    blockDurationMs: number;  // How long to block after max attempts
}

const DEFAULT_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,      // 15 minutes
    blockDurationMs: 15 * 60 * 1000 // 15 minutes block
};

/**
 * Check if an action is rate limited
 * @param key Unique identifier for the rate limit (e.g., 'login:user@email.com')
 * @param config Optional rate limit configuration
 * @returns Object with isLimited boolean and remainingTime in seconds if limited
 */
export function checkRateLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
): { isLimited: boolean; remainingTime?: number; attemptsRemaining?: number } {
    const { maxAttempts, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config };
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Check if currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
        return {
            isLimited: true,
            remainingTime: Math.ceil((entry.blockedUntil - now) / 1000)
        };
    }

    // Clean up expired entries or reset if window has passed
    if (!entry || (now - entry.firstAttempt > windowMs)) {
        entry = {
            attempts: 0,
            firstAttempt: now,
            blockedUntil: null
        };
        rateLimitStore.set(key, entry);
    }

    return {
        isLimited: false,
        attemptsRemaining: maxAttempts - entry.attempts
    };
}

/**
 * Record an attempt for rate limiting
 * @param key Unique identifier for the rate limit
 * @param config Optional rate limit configuration
 * @returns Updated rate limit status
 */
export function recordAttempt(
    key: string,
    config: Partial<RateLimitConfig> = {}
): { isLimited: boolean; remainingTime?: number; attemptsRemaining?: number } {
    const { maxAttempts, windowMs, blockDurationMs } = { ...DEFAULT_CONFIG, ...config };
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Initialize if doesn't exist or window expired
    if (!entry || (now - entry.firstAttempt > windowMs)) {
        entry = {
            attempts: 1,
            firstAttempt: now,
            blockedUntil: null
        };
    } else {
        entry.attempts += 1;
    }

    // Check if max attempts exceeded
    if (entry.attempts >= maxAttempts) {
        entry.blockedUntil = now + blockDurationMs;
        rateLimitStore.set(key, entry);
        return {
            isLimited: true,
            remainingTime: Math.ceil(blockDurationMs / 1000)
        };
    }

    rateLimitStore.set(key, entry);
    return {
        isLimited: false,
        attemptsRemaining: maxAttempts - entry.attempts
    };
}

/**
 * Clear rate limit for a key (e.g., after successful login)
 */
export function clearRateLimit(key: string): void {
    rateLimitStore.delete(key);
}

/**
 * Format remaining time for user display
 */
export function formatRemainingTime(seconds: number): string {
    if (seconds < 60) {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
