/**
 * Secure logging utility for production environments
 * Prevents sensitive information leakage while maintaining debuggability
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

interface LogContext {
    [key: string]: unknown;
}

/**
 * Sanitizes data by removing sensitive fields
 */
const sanitizeData = (data: unknown): unknown => {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
        'password',
        'token',
        'secret',
        'apiKey',
        'api_key',
        'privateKey',
        'private_key',
        'authorization',
        'bearer',
        'credential',
        'service_role',
        'serviceRole',
        'brevo',
        'stripe',
        'openai',
        'elevenlabs',
        'webhook',
    ];
    const sanitized = { ...data as Record<string, unknown> };

    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = '[REDACTED]';
        }
    }

    return sanitized;
};

/**
 * Secure logger that adapts based on environment
 */
export const secureLog = {
    /**
     * Log debug information (only in development)
     */
    debug: (message: string, context?: LogContext) => {
        if (isDev) {
            console.log(`[DEBUG] ${message}`, context ? sanitizeData(context) : '');
        }
    },

    /**
     * Log informational messages
     */
    info: (message: string, context?: LogContext) => {
        if (isDev) {
            console.info(`[INFO] ${message}`, context ? sanitizeData(context) : '');
        }
        // In production, could send to analytics/monitoring service
    },

    /**
     * Log warnings
     */
    warn: (message: string, context?: LogContext) => {
        if (isDev) {
            console.warn(`[WARN] ${message}`, context ? sanitizeData(context) : '');
        } else {
            console.warn(`[WARN] ${message}`);
            // In production, send to error tracking service (Sentry, etc.)
        }
    },

    /**
     * Log errors
     */
    error: (message: string, error?: unknown, context?: LogContext) => {
        if (isDev) {
            console.error(`[ERROR] ${message}`, error, context ? sanitizeData(context) : '');
        } else {
            // In production, log generic message and send details to error tracking
            console.error(`[ERROR] ${message}`);
            // TODO: Send to Sentry/LogRocket with full error details
            // Sentry.captureException(error, { extra: context });
        }
    },

    /**
     * Log security events (always logged, even in production)
     */
    security: (event: string, context?: LogContext) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[SECURITY] ${timestamp} - ${event}`;

        if (isDev) {
            console.warn(logMessage, context ? sanitizeData(context) : '');
        } else {
            console.warn(logMessage);
            // TODO: Send to security monitoring service
            // await supabase.from('security_events').insert({
            //     event_type: event,
            //     metadata: context,
            //     timestamp
            // });
        }
    }
};

/**
 * Log performance metrics
 */
export const logPerformance = (operation: string, duration: number) => {
    if (isDev) {
        console.log(`[PERF] ${operation}: ${duration}ms`);
    }
    // In production, send to performance monitoring
};

/**
 * Create a logger with a specific context/module name
 */
export const createLogger = (moduleName: string) => ({
    debug: (message: string, context?: LogContext) =>
        secureLog.debug(`[${moduleName}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
        secureLog.info(`[${moduleName}] ${message}`, context),
    warn: (message: string, context?: LogContext) =>
        secureLog.warn(`[${moduleName}] ${message}`, context),
    error: (message: string, error?: unknown, context?: LogContext) =>
        secureLog.error(`[${moduleName}] ${message}`, error, context),
    security: (event: string, context?: LogContext) =>
        secureLog.security(`[${moduleName}] ${event}`, context)
});
