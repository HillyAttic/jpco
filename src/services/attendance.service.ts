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
// Helper function to validate and clean location data
function validateLocationData(location: any) {
  if (!location) return undefined;
  
  // Check if both latitude and longitude are valid numbers
  if (location.latitude !== undefined && 
      location.longitude !== undefined && 
      typeof location.latitude === 'number' && 
      typeof location.longitude === 'number' &&
      !isNaN(location.latitude) && 
      !isNaN(location.longitude)) {
    const result: any = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    
    // Only add accuracy if it's a valid number
    if (location.accuracy !== undefined && typeof location.accuracy === 'number' && !isNaN(location.accuracy)) {
      result.accuracy = location.accuracy;
    }
    
    return result;
  }
  
  // Additional check for location object with lat/lng properties
  if (location.lat !== undefined && 
      location.lng !== undefined && 
      typeof location.lat === 'number' && 
      typeof location.lng === 'number' &&
      !isNaN(location.lat) && 
      !isNaN(location.lng)) {
    const result: any = {
      latitude: location.lat,
      longitude: location.lng,
    };
    
    // Only add accuracy if it's a valid number
    if (location.accuracy !== undefined && typeof location.accuracy === 'number' && !isNaN(location.accuracy)) {
      result.accuracy = location.accuracy;
    }
    
    return result;
  }
  
  return undefined;
}

export const attendanceService = {
  /**
   * Clock in an employee
   */
  async clockIn(data: ClockInData & { employeeId: string; employeeName: string }): Promise<AttendanceRecord | null> {
    try {
      // Check if employee is already clocked in
      const currentStatus = await this.getCurrentStatus(data.employeeId);
      if (currentStatus.isClockedIn) {
        // Instead of throwing, return null to indicate already clocked in
        return null;
      }

      const validatedLocation = validateLocationData(data.location);
      
      const record: Omit<AttendanceRecord, 'id'> = {
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        clockIn: data.timestamp,
        breaks: [],
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        status: 'active',
        location: validatedLocation ? { clockIn: validatedLocation } : undefined,
        notes: data.notes ? { clockIn: data.notes } : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Creating attendance record with data:', { ...record, clockIn: record.clockIn.toString() });
      
      return await attendanceFirebaseService.create(record);
    } catch (error) {
      console.error('Error in clockIn service:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      throw error;
    }
  },

  /**
   * Clock out an employee
   */
  async clockOut(recordId: string, data: ClockOutData): Promise<AttendanceRecord> {
    try {
      let record = await attendanceFirebaseService.getById(recordId);
      if (!record) {
        throw new Error('Attendance record not found');
      }
      
      // Convert timestamps in the retrieved record
      record = convertTimestamps(record);

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
        location: record.location ? {
          ...record.location,
          clockOut: validateLocationData(data.location),
        } : validateLocationData(data.location) ? {
          clockOut: validateLocationData(data.location)
        } : undefined,
        notes: {
          ...record.notes,
          clockOut: data.notes,
        },
      };

      console.log('Updating attendance record with data:', { ...updates, clockOut: updates.clockOut?.toString() });
      
      return await attendanceFirebaseService.update(recordId, updates);
    } catch (error) {
      console.error('Error in clockOut service:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      throw error;
    }
  },

  /**
   * Start a break
   */
  async startBreak(recordId: string): Promise<AttendanceRecord> {
    let record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }
    
    // Convert timestamps in the retrieved record
    record = convertTimestamps(record);

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
    let record = await attendanceFirebaseService.getById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }
    
    // Convert timestamps in the retrieved record
    record = convertTimestamps(record);

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
    // Get today's start of day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let records = await attendanceFirebaseService.getAll({
      filters: [
        { field: 'employeeId', operator: '==', value: employeeId },
        { field: 'status', operator: '==', value: 'active' },
        { field: 'clockIn', operator: '>=', value: Timestamp.fromDate(startOfDay) },
      ],
    });
    
    // Convert timestamps in the retrieved records
    records = records.map(record => convertTimestamps(record));
    
    // Filter records that are from today (client-side filtering for end-of-day)
    const todayRecords = records.filter(record => {
      const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const recordStartOfDay = new Date(recordDate);
      recordStartOfDay.setHours(0, 0, 0, 0);
      return recordStartOfDay.getTime() === today.getTime();
    });

    if (todayRecords.length === 0) {
      return {
        isClockedIn: false,
        isOnBreak: false,
        elapsedTime: 0,
        breakDuration: 0,
      };
    }

    const record = todayRecords[0];
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

    let records = await attendanceFirebaseService.getAll(options);
    
    // Convert timestamps in the retrieved records
    records = records.map(record => convertTimestamps(record));
    
    // Apply end date filter client-side if provided to avoid composite index requirements
    if (filters.endDate !== undefined) {
      records = records.filter(record => {
        const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
        return recordDate <= filters.endDate!;
      });
    }
    
    return records;
  },

  /**
   * Get a single attendance record
   */
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    const record = await attendanceFirebaseService.getById(id);
    return record ? convertTimestamps(record) : null;
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
        // Convert timestamps in the retrieved record
        const convertedRecord = convertTimestamps(record);
        const clockIn = data.clockIn || convertedRecord.clockIn;
        const clockOut = data.clockOut || convertedRecord.clockOut;
        const breaks = data.breaks || convertedRecord.breaks;

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
      // endDate filter is handled client-side to avoid composite index requirements
      status: 'completed',
    });
    
    // Apply end date filter client-side
    const filteredRecords = records.filter(record => {
      const recordDate = record.clockIn instanceof Date ? record.clockIn : new Date(record.clockIn);
      return recordDate <= period.end;
    });

    const totalDays = filteredRecords.length;
    const totalHours = filteredRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const overtimeHours = filteredRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
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
      where('status', '==', 'active'),
      where('clockIn', '>=', Timestamp.fromDate(today))
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
