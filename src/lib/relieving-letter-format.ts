/**
 * Relieving Letter Format Utilities
 * Pure functions for letter number formatting and parsing (no Firebase dependency)
 */

/**
 * Parses a letter number string to extract year and sequence number
 *
 * @param letterNumber - Letter number in format RL-YYYY-NNN
 * @returns Object with year and sequence number, or null if invalid format
 */
export function parseLetterNumber(letterNumber: string): { year: number; sequence: number } | null {
  const match = letterNumber.match(/^RL-(\d{4})-(\d{3})$/);
  if (!match) {
    return null;
  }

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

/**
 * Validates the format of a letter number
 *
 * @param letterNumber - The letter number to validate
 * @returns True if valid format (RL-YYYY-NNN), false otherwise
 */
export function isValidLetterNumberFormat(letterNumber: string): boolean {
  return /^RL-\d{4}-\d{3}$/.test(letterNumber);
}

/**
 * Formats a year and sequence number into a letter number string
 *
 * @param year - The year
 * @param sequence - The sequence number
 * @returns Formatted letter number string (e.g., "RL-2026-001")
 */
export function formatLetterNumber(year: number, sequence: number): string {
  const paddedNumber = String(sequence).padStart(3, '0');
  return `RL-${year}-${paddedNumber}`;
}
