/**
 * Roster Types
 * Type definitions for roster management system
 */

export interface RosterEntry {
  id?: string;
  userId: string;
  userName: string;
  activityName: string;
  startDate: Date;
  endDate: Date;
  month: number; // 1-12
  year: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RosterFilters {
  userId?: string;
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface MonthlyRosterView {
  month: number;
  year: number;
  employees: EmployeeRosterData[];
}

export interface EmployeeRosterData {
  userId: string;
  userName: string;
  activities: RosterActivity[];
}

export interface RosterActivity {
  id: string;
  activityName: string;
  startDate: Date;
  endDate: Date;
  startDay: number; // Day of month (1-31)
  endDay: number; // Day of month (1-31)
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  notes?: string;
  color?: string;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export const MONTH_DAYS: Record<number, number> = {
  1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
};

export function getDaysInMonth(month: number, year: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return MONTH_DAYS[month] || 31;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}
