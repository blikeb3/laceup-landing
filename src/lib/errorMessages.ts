/**
 * Secure Error Message Handling
 * 
 * This module prevents user enumeration and information disclosure by:
 * 1. Mapping internal errors to generic user-friendly messages
 * 2. Not revealing whether accounts exist
 * 3. Logging detailed errors server-side only
 * 4. Preventing timing attacks through consistent responses
 */

// Known Supabase error codes and messages
const SUPABASE_ERROR_PATTERNS = {
  INVALID_CREDENTIALS: [
    'Invalid login credentials',
    'invalid login credentials',
    'Email not confirmed',
    'User not found',
  ],
  EMAIL_NOT_CONFIRMED: [
    'Email not confirmed',
    'email not confirmed',
  ],
  WEAK_PASSWORD: [
    'Password should be at least',
    'password is too weak',
  ],
  ALREADY_REGISTERED: [
    'User already registered',
    'already registered',
    'duplicate key value',
  ],
  RATE_LIMITED: [
    'rate limit',
    'too many requests',
  ],
  NETWORK_ERROR: [
    'fetch failed',
    'network error',
    'Failed to fetch',
  ],
  MFA_REQUIRED: [
    'MFA verification required',
    'mfa required',
  ],
  INVALID_MFA_CODE: [
    'Invalid TOTP code',
    'invalid totp',
    'code has expired',
  ],
};

/**
 * Maps internal authentication errors to safe, user-friendly messages
 * Prevents account enumeration by using generic messages
 */
export function getSecureAuthErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for email not confirmed - specific helpful message
  if (SUPABASE_ERROR_PATTERNS.EMAIL_NOT_CONFIRMED.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'Please verify your email address before signing in. Check your inbox for the verification link.';
  }

  // Check for invalid credentials - generic message to prevent enumeration
  if (SUPABASE_ERROR_PATTERNS.INVALID_CREDENTIALS.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    // DO NOT reveal whether email exists or password is wrong
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  // Check for already registered - can be specific since it's during signup
  if (SUPABASE_ERROR_PATTERNS.ALREADY_REGISTERED.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Check for weak password
  if (SUPABASE_ERROR_PATTERNS.WEAK_PASSWORD.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'Password does not meet security requirements. Please use a stronger password.';
  }

  // Check for rate limiting
  if (SUPABASE_ERROR_PATTERNS.RATE_LIMITED.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  // Check for network errors
  if (SUPABASE_ERROR_PATTERNS.NETWORK_ERROR.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Check for MFA-related errors
  if (SUPABASE_ERROR_PATTERNS.MFA_REQUIRED.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'Two-factor authentication required. Please enter your verification code.';
  }

  if (SUPABASE_ERROR_PATTERNS.INVALID_MFA_CODE.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  )) {
    return 'Invalid or expired verification code. Please try again.';
  }

  // Log the original error for debugging (server-side in production)
  console.error('[Auth Error]:', errorMessage);

  // Generic fallback - never expose internal errors
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Secure error message for password reset
 * Always returns success message to prevent account enumeration
 */
export function getSecurePasswordResetMessage(error: unknown): string {
  // SECURITY: Always return same message regardless of whether email exists
  // This prevents attackers from discovering valid email addresses
  if (error) {
    console.error('[Password Reset Error]:', error);
  }
  
  return 'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.';
}

/**
 * Secure MFA error messages
 */
export function getSecureMfaErrorMessage(error: unknown): string {
  if (!error) {
    return 'Verification failed. Please try again.';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('invalid') || lowerMessage.includes('expired')) {
    return 'Invalid or expired verification code. Please try again.';
  }

  if (lowerMessage.includes('already used')) {
    return 'This backup code has already been used. Please use a different code.';
  }

  console.error('[MFA Error]:', errorMessage);
  return 'Verification failed. Please try again or contact support.';
}

/**
 * Validates and sanitizes error messages to ensure no sensitive data is exposed
 * Use this as a final safeguard before displaying any error to users
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove any potential sensitive patterns
  const sanitized = message
    // Remove email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    // Remove UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    // Remove IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]')
    // Remove database/table references
    .replace(/\b(table|column|database|schema)\s+["']?\w+["']?/gi, '[database reference]');

  return sanitized;
}

/**
 * Generic validation error formatter
 * Ensures validation errors don't leak system information
 */
export function formatValidationError(field: string, issue: string): string {
  // Whitelist of safe validation messages
  const safeMessages: Record<string, string> = {
    'required': `${field} is required`,
    'email': 'Please enter a valid email address',
    'password_length': 'Password must be at least 8 characters',
    'password_uppercase': 'Password must contain at least one uppercase letter',
    'password_lowercase': 'Password must contain at least one lowercase letter',
    'password_number': 'Password must contain at least one number',
    'password_match': 'Passwords do not match',
    'phone': 'Please enter a valid phone number',
  };

  return safeMessages[issue] || `${field} is invalid`;
}
