/**
 * Roster Service
 * Handles all roster-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import {
  RosterEntry,
  RosterFilters,
  MonthlyRosterView,
  EmployeeRosterData,
  RosterActivity,
  getDaysInMonth,
} from '@/types/roster.types';
import { Timestamp } from 'firebase/firestore';

// Create the Firebase service instance for roster entries
const rosterFirebaseService = createFirebaseService<RosterEntry>('rosters');

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestamps(entry: any): RosterEntry {
  const safeToDate = (value: any): Date => {
    if (!value) return new Date();
    if (value.toDate) return value.toDate();
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  return {
    ...entry,
    startDate: safeToDate(entry.startDate),
    endDate: safeToDate(entry.endDate),
    createdAt: safeToDate(entry.createdAt),
    updatedAt: safeToDate(entry.updatedAt),
  };
}

/**
 * Roster Service API
 */
export const rosterService = {
  /**
   * Create a new roster entry
   */
  async createRosterEntry(data: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<RosterEntry> {
    // Validate dates
    if (data.startDate > data.endDate) {
      throw new Error('Start date must be before end date');
    }

    // Check for overlapping entries for the same user
    const overlapping = await this.checkOverlap(data.userId, data.startDate, data.endDate);
    if (overlapping) {
      throw new Error('This schedule overlaps with an existing entry');
    }

    const entry: Omit<RosterEntry, 'id'> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await rosterFirebaseService.create(entry);
  },

  /**
   * Update a roster entry
   */
  async updateRosterEntry(id: string, data: Partial<RosterEntry>): Promise<RosterEntry> {
    // If dates are being updated, validate them
    if (data.startDate || data.endDate) {
      const existing = await rosterFirebaseService.getById(id);
      if (!existing) {
        throw new Error('Roster entry not found');
      }

      const convertedExisting = convertTimestamps(existing);
      const startDate = data.startDate || convertedExisting.startDate;
      const endDate = data.endDate || convertedExisting.endDate;

      if (startDate > endDate) {
        throw new Error('Start date must be before end date');
      }

      // Check for overlapping entries (excluding current entry)
      const overlapping = await this.checkOverlap(
        convertedExisting.userId,
        startDate,
        endDate,
        id
      );
      if (overlapping) {
        throw new Error('This schedule overlaps with an existing entry');
      }
    }

    const updates: Partial<RosterEntry> = {
      ...data,
      updatedAt: new Date(),
    };

    return await rosterFirebaseService.update(id, updates);
  },

  /**
   * Delete a roster entry
   */
  async deleteRosterEntry(id: string): Promise<void> {
    return await rosterFirebaseService.delete(id);
  },

  /**
   * Get roster entries with filters
   */
  async getRosterEntries(filters: RosterFilters): Promise<RosterEntry[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add user filter
    if (filters.userId) {
      options.filters!.push({
        field: 'userId',
        operator: '==',
        value: filters.userId,
      });
    }

    // Add month filter
    if (filters.month !== undefined) {
      options.filters!.push({
        field: 'month',
        operator: '==',
        value: filters.month,
      });
    }

    // Add year filter
    if (filters.year !== undefined) {
      options.filters!.push({
        field: 'year',
        operator: '==',
        value: filters.year,
      });
    }

    // Add date range filters
    if (filters.startDate) {
      options.filters!.push({
        field: 'startDate',
        operator: '>=',
        value: Timestamp.fromDate(filters.startDate),
      });
    }

    // Add default ordering
    options.orderByField = 'startDate';
    options.orderDirection = 'asc';

    let entries = await rosterFirebaseService.getAll(options);

    // Convert timestamps
    entries = entries.map(entry => convertTimestamps(entry));

    // Apply end date filter client-side if provided
    if (filters.endDate) {
      entries = entries.filter(entry => entry.endDate <= filters.endDate!);
    }

    return entries;
  },

  /**
   * Get a single roster entry
   */
  async getRosterEntry(id: string): Promise<RosterEntry | null> {
    const entry = await rosterFirebaseService.getById(id);
    return entry ? convertTimestamps(entry) : null;
  },

  /**
   * Get monthly roster view for all employees (Admin/Manager)
   */
  async getMonthlyRosterView(month: number, year: number, userIds?: string[]): Promise<MonthlyRosterView> {
    // Get all roster entries for the specified month and year
    let entries = await this.getRosterEntries({ month, year });

    // Filter by user IDs if provided
    if (userIds && userIds.length > 0) {
      entries = entries.filter(entry => userIds.includes(entry.userId));
    }

    // Group entries by user
    const employeeMap = new Map<string, EmployeeRosterData>();

    entries.forEach(entry => {
      if (!employeeMap.has(entry.userId)) {
        employeeMap.set(entry.userId, {
          userId: entry.userId,
          userName: entry.userName,
          activities: [],
        });
      }

      const employee = employeeMap.get(entry.userId)!;
      employee.activities.push({
        id: entry.id!,
        activityName: entry.activityName,
        startDate: entry.startDate,
        endDate: entry.endDate,
        startDay: entry.startDate.getDate(),
        endDay: entry.endDate.getDate(),
        notes: entry.notes,
      });
    });

    return {
      month,
      year,
      employees: Array.from(employeeMap.values()),
    };
  },

  /**
   * Get user's calendar events
   */
  async getUserCalendarEvents(userId: string, month: number, year: number): Promise<RosterEntry[]> {
    return await this.getRosterEntries({ userId, month, year });
  },

  /**
   * Check for overlapping roster entries
   */
  async checkOverlap(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<boolean> {
    const entries = await this.getRosterEntries({ userId });

    return entries.some(entry => {
      // Skip the entry being updated
      if (excludeId && entry.id === excludeId) {
        return false;
      }

      // Check for overlap
      return (
        (startDate >= entry.startDate && startDate <= entry.endDate) ||
        (endDate >= entry.startDate && endDate <= entry.endDate) ||
        (startDate <= entry.startDate && endDate >= entry.endDate)
      );
    });
  },

  /**
   * Get roster entries for a date range (for calendar view)
   */
  async getRosterEntriesForDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RosterEntry[]> {
    return await this.getRosterEntries({
      userId,
      startDate,
      endDate,
    });
  },

  /**
   * Bulk create roster entries
   */
  async bulkCreateRosterEntries(entries: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<RosterEntry[]> {
    const created: RosterEntry[] = [];

    for (const entry of entries) {
      try {
        const result = await this.createRosterEntry(entry);
        created.push(result);
      } catch (error) {
        console.error('Error creating roster entry:', error);
        // Continue with other entries
      }
    }

    return created;
  },
};
