/**
 * Attendance Service
 * Handles all attendance-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceStats,
  CurrentAttendanceStatus,
  ClockInData,
  ClockOutData,
  BreakRecord,
  DateRange,
  TeamMemberAttendanceStatus,
} from '@/types/attendance.types';
import {
  calculateWorkHours,
  calculateOvertimeHours,
  calculateRegularHours,
  calculateTotalBreakDuration,
  calculateElapsedTime,
} from '@/utils/time-calculations';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';

// Create the Firebase service instance for attendance records
const attendanceFirebaseService =
  createFirebaseService<AttendanceRecord>('attendance-records');

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestamps(record: any): AttendanceRecord {
  return {
    ...record,
    clockIn: record.clockIn?.toDate ? record.clockIn.toDate() : new Date(record.clockIn),
    clockOut: record.clockOut?.toDate ? record.clockOut.toDate() : record.clockOut ? new Date(record.clockOut) : undefined,
    breaks: record.breaks?.map((b: any) => ({
      ...b,
      startTime: b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime),
      endTime: b.endTime?.toDate ? b.endTime.toDate() : b.endTime ? new Date(b.endTime) : undefined,
    })) || [],
    createdAt: record.createdAt?.toDate ? record.createdAt.toDate() : new Date(record.createdAt),
    updatedAt: record.updatedAt?.toDate ? record.updatedAt.toDate() : new Date(record.updatedAt),
  };
}

/**
 * Attendance Service API
 */
export const attendanceService = {
  /**
   * Clock in an employee
   */
  async clockIn(data: ClockInData & { employeeId: string; employeeName: string }): Promise<AttendanceRecord> {
    // Check if employee is already clocked in
    const currentStatus = await this.getCurrentStatus(data.employeeId);
    if (currentStatus.isClockedIn) {
      throw new Error('Employee is already clocked in');
    }

    const record: Omit<AttendanceRecord, 'id'> = {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      clockIn: data.timestamp,
      breaks: [],
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      status: 'active',
      location: data.location ? { clockIn: data.location } : undefined,
      notes: data.notes ? { clockIn: data.notes } : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return attendanceFirebaseService.create(record);
  },

  /**
   * Clock out an employee
   */
  async clockOut(recordId: string, data: ClockOutData): Promise<AttendanceRecord> {
    const record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }

    if (record.clockOut) {
      throw new Error('Employee is already clocked out');
    }

    // Calculate hours
    const totalHours = calculateWorkHours(record.clockIn, data.timestamp, record.breaks);
    const overtimeHours = calculateOvertimeHours(totalHours);
    const regularHours = calculateRegularHours(totalHours, overtimeHours);

    const updates: Partial<AttendanceRecord> = {
      clockOut: data.timestamp,
      totalHours,
      regularHours,
      overtimeHours,
      status: 'completed',
      location: {
        ...record.location,
        clockOut: data.location,
      },
      notes: {
        ...record.notes,
        clockOut: data.notes,
      },
    };

    return attendanceFirebaseService.update(recordId, updates);
  },

  /**
   * Start a break
   */
  async startBreak(recordId: string): Promise<AttendanceRecord> {
    const record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }

    if (record.clockOut) {
      throw new Error('Cannot start break after clocking out');
    }

    // Check if already on break
    const onBreak = record.breaks.some((b) => !b.endTime);
    if (onBreak) {
      throw new Error('Employee is already on break');
    }

    const newBreak: BreakRecord = {
      id: `break_${Date.now()}`,
      startTime: new Date(),
      duration: 0,
    };

    const updates: Partial<AttendanceRecord> = {
      breaks: [...record.breaks, newBreak],
    };

    return attendanceFirebaseService.update(recordId, updates);
  },

  /**
   * End a break
   */
  async endBreak(recordId: string): Promise<AttendanceRecord> {
    const record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }

    // Find the active break
    const breakIndex = record.breaks.findIndex((b) => !b.endTime);
    if (breakIndex === -1) {
      throw new Error('No active break found');
    }

    const endTime = new Date();
    const updatedBreaks = [...record.breaks];
    updatedBreaks[breakIndex] = {
      ...updatedBreaks[breakIndex],
      endTime,
      duration: (endTime.getTime() - updatedBreaks[breakIndex].startTime.getTime()) / 1000,
    };

    const updates: Partial<AttendanceRecord> = {
      breaks: updatedBreaks,
    };

    return attendanceFirebaseService.update(recordId, updates);
  },

  /**
   * Get current attendance status for an employee
   */
  async getCurrentStatus(employeeId: string): Promise<CurrentAttendanceStatus> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await attendanceFirebaseService.getAll({
      filters: [
        { field: 'employeeId', operator: '==', value: employeeId },
        { field: 'clockIn', operator: '>=', value: Timestamp.fromDate(today) },
        { field: 'status', operator: '==', value: 'active' },
      ],
    });

    if (records.length === 0) {
      return {
        isClockedIn: false,
        isOnBreak: false,
        elapsedTime: 0,
        breakDuration: 0,
      };
    }

    const record = records[0];
    const isOnBreak = record.breaks.some((b) => !b.endTime);
    const breakStartTime = isOnBreak
      ? record.breaks.find((b) => !b.endTime)?.startTime
      : undefined;

    return {
      isClockedIn: true,
      clockInTime: record.clockIn,
      isOnBreak,
      breakStartTime,
      elapsedTime: calculateElapsedTime(record.clockIn, record.breaks),
      breakDuration: calculateTotalBreakDuration(record.breaks),
      currentRecordId: record.id,
    };
  },

  /**
   * Get attendance records with filters
   */
  async getAttendanceRecords(filters: AttendanceFilters): Promise<AttendanceRecord[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add employee filter
    if (filters.employeeId) {
      options.filters!.push({
        field: 'employeeId',
        operator: '==',
        value: filters.employeeId,
      });
    }

    // Add date range filters
    if (filters.startDate) {
      options.filters!.push({
        field: 'clockIn',
        operator: '>=',
        value: Timestamp.fromDate(filters.startDate),
      });
    }

    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      options.filters!.push({
        field: 'clockIn',
        operator: '<=',
        value: Timestamp.fromDate(endOfDay),
      });
    }

    // Add status filter
    if (filters.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add pagination
    if (filters.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'clockIn';
    options.orderDirection = 'desc';

    return attendanceFirebaseService.getAll(options);
  },

  /**
   * Get a single attendance record
   */
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    return attendanceFirebaseService.getById(id);
  },

  /**
   * Update an attendance record (manual edit)
   */
  async updateAttendanceRecord(
    id: string,
    data: Partial<AttendanceRecord>,
    editedBy: string,
    editReason: string
  ): Promise<AttendanceRecord> {
    const updates: Partial<AttendanceRecord> = {
      ...data,
      status: 'edited',
      editedBy,
      editReason,
    };

    // Recalculate hours if clock in/out or breaks changed
    if (data.clockIn || data.clockOut || data.breaks) {
      const record = await attendanceFirebaseService.getById(id);
      if (record) {
        const clockIn = data.clockIn || record.clockIn;
        const clockOut = data.clockOut || record.clockOut;
        const breaks = data.breaks || record.breaks;

        if (clockOut) {
          const totalHours = calculateWorkHours(clockIn, clockOut, breaks);
          const overtimeHours = calculateOvertimeHours(totalHours);
          const regularHours = calculateRegularHours(totalHours, overtimeHours);

          updates.totalHours = totalHours;
          updates.regularHours = regularHours;
          updates.overtimeHours = overtimeHours;
        }
      }
    }

    return attendanceFirebaseService.update(id, updates);
  },

  /**
   * Delete an attendance record
   */
  async deleteAttendanceRecord(id: string): Promise<void> {
    return attendanceFirebaseService.delete(id);
  },

  /**
   * Get attendance statistics for an employee
   */
  async getAttendanceStats(employeeId: string, period: DateRange): Promise<AttendanceStats> {
    const records = await this.getAttendanceRecords({
      employeeId,
      startDate: period.start,
      endDate: period.end,
      status: 'completed',
    });

    const totalDays = records.length;
    const totalHours = records.reduce((sum, r) => sum + r.totalHours, 0);
    const overtimeHours = records.reduce((sum, r) => sum + r.overtimeHours, 0);
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;

    // Calculate attendance rate (assuming 5-day work week)
    const daysBetween = Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedDays = Math.floor(daysBetween / 7) * 5 + (daysBetween % 7);
    const attendanceRate = expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0;

    return {
      totalDays,
      presentDays: totalDays,
      absentDays: Math.max(0, expectedDays - totalDays),
      leaveDays: 0, // Will be calculated from leave records
      totalHours,
      averageHours,
      overtimeHours,
      attendanceRate,
      punctualityRate: 100, // Will be calculated based on shift data
    };
  },

  /**
   * Get team attendance status for a specific date
   */
  async getTeamAttendanceStatus(
    teamId: string,
    date: Date
  ): Promise<TeamMemberAttendanceStatus[]> {
    // This would need to integrate with the employee service
    // For now, return empty array
    return [];
  },

  /**
   * Subscribe to real-time attendance status updates
   */
  subscribeToStatus(
    employeeId: string,
    callback: (status: CurrentAttendanceStatus) => void
  ): Unsubscribe {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'attendance-records'),
      where('employeeId', '==', employeeId),
      where('clockIn', '>=', Timestamp.fromDate(today)),
      where('status', '==', 'active')
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback({
          isClockedIn: false,
          isOnBreak: false,
          elapsedTime: 0,
          breakDuration: 0,
        });
        return;
      }

      const doc = snapshot.docs[0];
      const record = convertTimestamps({ id: doc.id, ...doc.data() });
      const isOnBreak = record.breaks.some((b) => !b.endTime);
      const breakStartTime = isOnBreak
        ? record.breaks.find((b) => !b.endTime)?.startTime
        : undefined;

      callback({
        isClockedIn: true,
        clockInTime: record.clockIn,
        isOnBreak,
        breakStartTime,
        elapsedTime: calculateElapsedTime(record.clockIn, record.breaks),
        breakDuration: calculateTotalBreakDuration(record.breaks),
        currentRecordId: record.id,
      });
    });
  },

  /**
   * Auto clock out employees at midnight
   */
  async autoClockOut(autoClockOutTime: string = '23:59'): Promise<void> {
    const [hours, minutes] = autoClockOutTime.split(':').map(Number);
    const clockOutTime = new Date();
    clockOutTime.setHours(hours, minutes, 59, 999);

    const activeRecords = await attendanceFirebaseService.getAll({
      filters: [{ field: 'status', operator: '==', value: 'active' }],
    });

    for (const record of activeRecords) {
      await this.clockOut(record.id!, {
        timestamp: clockOutTime,
        notes: 'Auto clock out',
      });
    }
  },
};
