import { AttendanceRecord, BreakRecord, Shift } from '@/types/attendance.types';

/**
 * Calculate work hours between clock in and clock out, excluding breaks
 * @param clockIn - Clock in timestamp
 * @param clockOut - Clock out timestamp
 * @param breaks - Array of break records
 * @returns Total work hours
 */
export function calculateWorkHours(
  clockIn: Date,
  clockOut: Date,
  breaks: BreakRecord[] = []
): number {
  const totalMilliseconds = clockOut.getTime() - clockIn.getTime();
  const totalSeconds = totalMilliseconds / 1000;

  // Calculate total break duration
  const breakDuration = breaks.reduce((total, breakRecord) => {
    if (breakRecord.endTime) {
      const breakSeconds =
        (breakRecord.endTime.getTime() - breakRecord.startTime.getTime()) / 1000;
      return total + breakSeconds;
    }
    return total;
  }, 0);

  // Work hours = total time - break time
  const workSeconds = totalSeconds - breakDuration;
  return workSeconds / 3600; // Convert to hours
}

/**
 * Calculate break duration in seconds
 * @param breakStart - Break start timestamp
 * @param breakEnd - Break end timestamp (optional, uses current time if not provided)
 * @returns Break duration in seconds
 */
export function calculateBreakDuration(
  breakStart: Date,
  breakEnd?: Date
): number {
  const endTime = breakEnd || new Date();
  return (endTime.getTime() - breakStart.getTime()) / 1000;
}

/**
 * Calculate total break duration from multiple breaks
 * @param breaks - Array of break records
 * @returns Total break duration in seconds
 */
export function calculateTotalBreakDuration(breaks: BreakRecord[]): number {
  return breaks.reduce((total, breakRecord) => {
    if (breakRecord.endTime) {
      const duration =
        (breakRecord.endTime.getTime() - breakRecord.startTime.getTime()) / 1000;
      return total + duration;
    }
    return total;
  }, 0);
}

/**
 * Calculate overtime hours based on shift
 * @param totalHours - Total work hours
 * @param shift - Shift definition (optional)
 * @returns Overtime hours
 */
export function calculateOvertimeHours(
  totalHours: number,
  shift?: Shift
): number {
  if (!shift) {
    // Default: overtime after 8 hours
    return Math.max(0, totalHours - 8);
  }

  const shiftDuration = calculateShiftDuration(shift);
  const overtimeThresholdHours = shift.overtimeThreshold / 60;
  const threshold = shiftDuration + overtimeThresholdHours;

  return Math.max(0, totalHours - threshold);
}

/**
 * Calculate regular hours (non-overtime)
 * @param totalHours - Total work hours
 * @param overtimeHours - Overtime hours
 * @returns Regular hours
 */
export function calculateRegularHours(
  totalHours: number,
  overtimeHours: number
): number {
  return totalHours - overtimeHours;
}

/**
 * Calculate shift duration in hours
 * @param shift - Shift definition
 * @returns Shift duration in hours
 */
export function calculateShiftDuration(shift: Shift): number {
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const durationMinutes = endMinutes - startMinutes - shift.breakDuration;
  return durationMinutes / 60;
}

/**
 * Calculate elapsed time since clock in
 * @param clockIn - Clock in timestamp
 * @param breaks - Array of break records
 * @returns Elapsed time in seconds (excluding breaks)
 */
export function calculateElapsedTime(
  clockIn: Date,
  breaks: BreakRecord[] = []
): number {
  const now = new Date();
  const totalSeconds = (now.getTime() - clockIn.getTime()) / 1000;

  // Subtract completed break durations
  const completedBreakDuration = breaks.reduce((total, breakRecord) => {
    if (breakRecord.endTime) {
      const duration =
        (breakRecord.endTime.getTime() - breakRecord.startTime.getTime()) / 1000;
      return total + duration;
    }
    return total;
  }, 0);

  // Subtract current break duration if on break
  const currentBreak = breaks.find((b) => !b.endTime);
  const currentBreakDuration = currentBreak
    ? (now.getTime() - currentBreak.startTime.getTime()) / 1000
    : 0;

  return totalSeconds - completedBreakDuration - currentBreakDuration;
}

/**
 * Format duration in seconds to HH:mm:ss
 * @param seconds - Duration in seconds
 * @returns Formatted string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format hours to HH:mm
 * @param hours - Hours as decimal
 * @returns Formatted string
 */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Format time to HH:mm:ss
 * @param date - Date object
 * @returns Formatted string
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format time to HH:mm
 * @param date - Date object
 * @returns Formatted string
 */
export function formatTimeShort(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Parse time string (HH:mm) to minutes since midnight
 * @param timeString - Time string in HH:mm format
 * @returns Minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if employee is late based on shift and grace period
 * @param clockIn - Clock in timestamp
 * @param shift - Shift definition
 * @param graceMinutes - Grace period in minutes
 * @returns true if late, false otherwise
 */
export function isLate(
  clockIn: Date,
  shift: Shift,
  graceMinutes: number = 0
): boolean {
  const clockInMinutes =
    clockIn.getHours() * 60 + clockIn.getMinutes();
  const shiftStartMinutes = parseTimeToMinutes(shift.startTime);
  const allowedMinutes = shiftStartMinutes + graceMinutes;

  return clockInMinutes > allowedMinutes;
}

/**
 * Check if employee left early based on shift
 * @param clockOut - Clock out timestamp
 * @param shift - Shift definition
 * @returns true if early departure, false otherwise
 */
export function isEarlyDeparture(clockOut: Date, shift: Shift): boolean {
  const clockOutMinutes =
    clockOut.getHours() * 60 + clockOut.getMinutes();
  const shiftEndMinutes = parseTimeToMinutes(shift.endTime);

  return clockOutMinutes < shiftEndMinutes;
}

/**
 * Get date range for a period
 * @param period - Period type ('today', 'week', 'month', 'year')
 * @param referenceDate - Reference date (default: today)
 * @returns Start and end dates
 */
export function getDateRange(
  period: 'today' | 'week' | 'month' | 'year',
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'week':
      // Start of week (Sunday)
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      // End of week (Saturday)
      end.setDate(end.getDate() + (6 - end.getDay()));
      end.setHours(23, 59, 59, 999);
      break;

    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Calculate number of days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1; // Include both start and end dates
}

/**
 * Check if a date is a weekend
 * @param date - Date to check
 * @returns true if weekend, false otherwise
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get business days between two dates (excluding weekends)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of business days
 */
export function getBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
