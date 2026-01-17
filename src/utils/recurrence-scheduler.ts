/**
 * Recurrence Scheduler Utility
 * Functions to calculate next occurrence dates based on recurrence patterns
 * Validates Requirement: 3.4
 */

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * Calculate the next occurrence date based on the recurrence pattern
 * @param currentDate - The current occurrence date
 * @param pattern - The recurrence pattern (daily, weekly, monthly, quarterly)
 * @returns The next occurrence date
 */
export function calculateNextOccurrence(
  currentDate: Date,
  pattern: RecurrencePattern
): Date {
  const next = new Date(currentDate);

  switch (pattern) {
    case 'daily':
      return calculateDailyRecurrence(next);
    case 'weekly':
      return calculateWeeklyRecurrence(next);
    case 'monthly':
      return calculateMonthlyRecurrence(next);
    case 'quarterly':
      return calculateQuarterlyRecurrence(next);
    default:
      throw new Error(`Invalid recurrence pattern: ${pattern}`);
  }
}

/**
 * Calculate next occurrence for daily recurrence
 * Adds 1 day to the current date
 * @param currentDate - The current occurrence date
 * @returns The next occurrence date (1 day later)
 */
export function calculateDailyRecurrence(currentDate: Date): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Calculate next occurrence for weekly recurrence
 * Adds 7 days to the current date
 * @param currentDate - The current occurrence date
 * @returns The next occurrence date (7 days later)
 */
export function calculateWeeklyRecurrence(currentDate: Date): Date {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + 7);
  return next;
}

/**
 * Calculate next occurrence for monthly recurrence
 * Adds 1 month to the current date, handling edge cases for month-end dates
 * @param currentDate - The current occurrence date
 * @returns The next occurrence date (1 month later)
 */
export function calculateMonthlyRecurrence(currentDate: Date): Date {
  const next = new Date(currentDate);
  const currentDay = next.getDate();
  
  // Add one month
  next.setMonth(next.getMonth() + 1);
  
  // Handle edge case: if the day changed (e.g., Jan 31 -> Feb 28/29)
  // Set to the last day of the target month
  if (next.getDate() !== currentDay) {
    next.setDate(0); // Sets to last day of previous month (which is our target month)
  }
  
  return next;
}

/**
 * Calculate next occurrence for quarterly recurrence
 * Adds 3 months to the current date, handling edge cases for month-end dates
 * @param currentDate - The current occurrence date
 * @returns The next occurrence date (3 months later)
 */
export function calculateQuarterlyRecurrence(currentDate: Date): Date {
  const next = new Date(currentDate);
  const currentDay = next.getDate();
  
  // Add three months
  next.setMonth(next.getMonth() + 3);
  
  // Handle edge case: if the day changed (e.g., May 31 -> Aug 31)
  // Set to the last day of the target month
  if (next.getDate() !== currentDay) {
    next.setDate(0); // Sets to last day of previous month (which is our target month)
  }
  
  return next;
}

/**
 * Calculate all occurrences between start and end dates
 * @param startDate - The start date
 * @param endDate - The end date
 * @param pattern - The recurrence pattern
 * @returns Array of occurrence dates
 */
export function calculateAllOccurrences(
  startDate: Date,
  endDate: Date,
  pattern: RecurrencePattern
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    occurrences.push(new Date(currentDate));
    currentDate = calculateNextOccurrence(currentDate, pattern);
  }
  
  return occurrences;
}

/**
 * Calculate the number of occurrences between two dates
 * @param startDate - The start date
 * @param endDate - The end date
 * @param pattern - The recurrence pattern
 * @returns The number of occurrences
 */
export function calculateOccurrenceCount(
  startDate: Date,
  endDate: Date,
  pattern: RecurrencePattern
): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  switch (pattern) {
    case 'daily':
      return diffDays + 1; // Include both start and end dates
    case 'weekly':
      return Math.floor(diffDays / 7) + 1;
    case 'monthly':
      // Calculate month difference
      const monthDiff = 
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      return monthDiff + 1;
    case 'quarterly':
      // Calculate quarter difference
      const quarterDiff = Math.floor(
        ((endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth())) / 3
      );
      return quarterDiff + 1;
    default:
      return 0;
  }
}

/**
 * Check if a date should have an occurrence based on the pattern
 * @param date - The date to check
 * @param startDate - The start date of the recurrence
 * @param pattern - The recurrence pattern
 * @returns True if the date should have an occurrence
 */
export function isOccurrenceDate(
  date: Date,
  startDate: Date,
  pattern: RecurrencePattern
): boolean {
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  switch (pattern) {
    case 'daily':
      return diffDays >= 0;
    case 'weekly':
      return diffDays >= 0 && diffDays % 7 === 0;
    case 'monthly':
      // Check if same day of month
      return date.getDate() === startDate.getDate() && diffDays >= 0;
    case 'quarterly':
      // Check if same day and month is 3 months apart
      const monthDiff = 
        (date.getFullYear() - startDate.getFullYear()) * 12 +
        (date.getMonth() - startDate.getMonth());
      return date.getDate() === startDate.getDate() && 
             monthDiff >= 0 && 
             monthDiff % 3 === 0;
    default:
      return false;
  }
}

/**
 * Get a human-readable description of the recurrence pattern
 * @param pattern - The recurrence pattern
 * @returns A human-readable description
 */
export function getRecurrenceDescription(pattern: RecurrencePattern): string {
  const descriptions = {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
    quarterly: 'Every 3 months'
  };
  
  return descriptions[pattern] || 'Unknown pattern';
}

/**
 * Get the next N occurrences from a start date
 * @param startDate - The start date
 * @param pattern - The recurrence pattern
 * @param count - Number of occurrences to calculate
 * @returns Array of the next N occurrence dates
 */
export function getNextOccurrences(
  startDate: Date,
  pattern: RecurrencePattern,
  count: number
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    occurrences.push(new Date(currentDate));
    currentDate = calculateNextOccurrence(currentDate, pattern);
  }
  
  return occurrences;
}
