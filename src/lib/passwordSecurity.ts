/**
 * Check if a password has been exposed in known data breaches using the Have I Been Pwned API
 * This implements the k-anonymity model for privacy:
 * 1. Hash the password with SHA-1
 * 2. Send only the first 5 characters of the hash to the API
 * 3. Check if the suffix matches any exposed passwords
 * 
 * @param password - The password to check
 * @returns Promise<boolean> - true if password is exposed, false if safe
 */
export async function isPasswordExposed(password: string): Promise<boolean> {
  try {
    // Hash password with SHA-1 using Web Crypto API (browser-compatible)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Get first 5 characters of hash
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HIBP API with prefix only
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'LaceUP-Security',
      },
    });

    if (!response.ok) {
      // If API is unavailable, don't block signup - just log
      console.warn('HIBP API unavailable:', response.status);
      return false;
    }

    const text = await response.text();
    
    // Check if any returned hash matches our suffix
    const hashes = text.split('\r\n');
    for (const hash of hashes) {
      const [returnedSuffix, count] = hash.split(':');
      if (returnedSuffix === suffix) {
        // Password found in breaches
        const breachCount = parseInt(count, 10);
        console.warn(`Password found in ${breachCount} known breaches`);
        return true;
      }
    }

    // Password not found in any breach
    return false;
  } catch (error) {
    console.error('Error checking password exposure:', error);
    // If check fails, don't block the user - this is a best-effort check
    return false;
  }
}

/**
 * Validate password strength and breach status
 * @param password - The password to validate
 * @returns Promise<{isStrong: boolean, isExposed: boolean, message: string}>
 */
export async function validatePasswordSecurity(password: string): Promise<{
  isStrong: boolean;
  isExposed: boolean;
  message: string;
}> {
  const errors: string[] = [];

  // Check strength requirements
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  const isStrong = errors.length === 0;

  // Check breach status
  const isExposed = await isPasswordExposed(password);

  let message = '';
  if (!isStrong) {
    message = errors.join(', ');
  }
  if (isExposed) {
    message = (message ? message + '. Also, t' : 'T') + 'his password has been exposed in known data breaches. Please choose a different password.';
  }

  return {
    isStrong: isStrong && !isExposed,
    isExposed,
    message,
  };
}
