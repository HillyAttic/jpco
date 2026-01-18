'use client';

import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '@/services/attendance.service';
import { 
  AttendanceRecord, 
  CurrentAttendanceStatus, 
  AttendanceStats,
  ClockInData,
  ClockOutData 
} from '@/types/attendance.types';

export function useAttendance(employeeId?: string) {
  const [currentStatus, setCurrentStatus] = useState<CurrentAttendanceStatus | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current attendance status
  const fetchCurrentStatus = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      setIsLoading(true);
      const status = await attendanceService.getCurrentStatus(employeeId);
      setCurrentStatus(status);
      
      // If clocked in, get today's record
      if (status.isClockedIn && status.currentRecordId) {
        const record = await attendanceService.getAttendanceRecord(status.currentRecordId);
        setTodayRecord(record);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance status');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  // Fetch attendance stats
  const fetchStats = useCallback(async () => {
    if (!employeeId) return;
    
    try {
      const monthStats = await attendanceService.getAttendanceStats(employeeId, {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date()
      });
      setStats(monthStats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [employeeId]);

  // Clock in
  const clockIn = useCallback(async (data: ClockInData) => {
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }
    
    try {
      setIsLoading(true);
      // Add employee info to the clock in data
      const clockInData = {
        ...data,
        employeeId,
        employeeName: 'Employee' // TODO: Get actual employee name
      };
      const record = await attendanceService.clockIn(clockInData);
      setTodayRecord(record);
      await fetchCurrentStatus();
      return record;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clock in';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, fetchCurrentStatus]);

  // Clock out
  const clockOut = useCallback(async (data: ClockOutData) => {
    if (!currentStatus?.currentRecordId) {
      throw new Error('No active clock-in record found');
    }
    
    try {
      setIsLoading(true);
      const record = await attendanceService.clockOut(currentStatus.currentRecordId, data);
      setTodayRecord(record);
      await fetchCurrentStatus();
      return record;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clock out';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentStatus?.currentRecordId, fetchCurrentStatus]);

  // Start break
  const startBreak = useCallback(async (recordId: string) => {
    try {
      await attendanceService.startBreak(recordId);
      await fetchCurrentStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start break';
      setError(message);
      throw new Error(message);
    }
  }, [fetchCurrentStatus]);

  // End break
  const endBreak = useCallback(async (recordId: string, breakId?: string) => {
    try {
      await attendanceService.endBreak(recordId);
      await fetchCurrentStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end break';
      setError(message);
      throw new Error(message);
    }
  }, [fetchCurrentStatus]);

  useEffect(() => {
    if (employeeId) {
      fetchCurrentStatus();
      fetchStats();
    }
  }, [employeeId, fetchCurrentStatus, fetchStats]);

  return {
    currentStatus,
    todayRecord,
    stats,
    isLoading,
    error,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refetch: fetchCurrentStatus
  };
}