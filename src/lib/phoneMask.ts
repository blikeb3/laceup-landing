/**
 * Format phone number with mask
 * Converts input to format: (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  
  // Limit to 10 digits for US phone numbers
  const limited = cleaned.slice(0, 10);
  
  // Apply formatting
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
};

/**
 * Get clean phone number (digits only)
 */
export const getCleanPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};
