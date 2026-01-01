/**
 * Utility functions for handling user names
 */

/**
 * Get full name from first_name and last_name
 */
export const getFullName = (firstName?: string | null, lastName?: string | null): string => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';

  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return '';
};

/**
 * Get initials from first_name and last_name
 */
export const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';

  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0]?.toUpperCase() || '';
  if (last) return last[0]?.toUpperCase() || '';
  return '?';
};

/**
 * Get display name - returns full name or fallback
 */
export const getDisplayName = (firstName?: string | null, lastName?: string | null, fallback = 'Unknown User'): string => {
  const fullName = getFullName(firstName, lastName);
  return fullName || fallback;
};

/**
 * Format group chat display name
 * Shows first participant's first name + count of others
 * e.g., "John +3" for a group with John and 3 other people
 */
export const formatGroupDisplayName = (
  participants: Array<{ first_name: string | null; last_name: string | null }>,
  customName?: string | null
): string => {
  // If there's a custom name set, use it
  if (customName?.trim()) {
    return customName.trim();
  }

  if (!participants || participants.length === 0) {
    return 'Group Chat';
  }

  const fullName = getFullName(participants[0]?.first_name, participants[0]?.last_name);
  const othersCount = participants.length - 1;

  if (othersCount === 0) {
    return fullName;
  }

  return `${fullName} +${othersCount}`;
};
