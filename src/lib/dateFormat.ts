/**
 * Formats a date string or Date object to a readable format like "December 3rd, 2025"
 */
export const formatDateLong = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  
  // Add ordinal suffix (st, nd, rd, th)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

/**
 * Formats a date for input fields in format "December 2025"
 */
export const formatDateMonth = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return '';
  
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  
  return `${month} ${year}`;
};

/**
 * Converts a "Month Year" string to ISO date string for storage
 */
export const monthYearToISO = (monthYear: string): string => {
  if (!monthYear) return '';
  
  // Parse "December 2025" format
  const parts = monthYear.trim().split(' ');
  if (parts.length !== 2) return monthYear; // Return as-is if not in expected format
  
  const month = parts[0];
  const year = parts[1];
  
  const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
  const date = new Date(parseInt(year), monthIndex, 1);
  
  if (isNaN(date.getTime())) return monthYear;
  
  return date.toISOString().split('T')[0];
};

/**
 * Parses ISO date string to "Month Year" format for display
 */
export const isoToMonthYear = (isoDate: string): string => {
  if (!isoDate) return '';
  return formatDateMonth(isoDate);
};
