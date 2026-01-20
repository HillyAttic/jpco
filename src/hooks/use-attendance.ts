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
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

// Check if we're running in a secure context (HTTPS)
const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

export function useAttendance() {
  const { user, userProfile, loading: authLoading } = useEnhancedAuth();
  
  // Initialize from localStorage if available
  const [currentStatus, setCurrentStatus] = useState<CurrentAttendanceStatus | null>(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      const savedStatus = localStorage.getItem(`attendance_current_status_${user.uid}`);
      if (savedStatus) {
        try {
          return JSON.parse(savedStatus);
        } catch (e) {
          console.error('Error parsing saved attendance status:', e);
        }
      }
    }
    return null;
  });
  
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      const savedRecord = localStorage.getItem(`attendance_today_record_${user.uid}`);
      if (savedRecord) {
        try {
          return JSON.parse(savedRecord);
        } catch (e) {
          console.error('Error parsing saved attendance record:', e);
        }
      }
    }
    return null;
  });
  
  const [stats, setStats] = useState<AttendanceStats | null>(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      const savedStats = localStorage.getItem(`attendance_stats_${user.uid}`);
      if (savedStats) {
        try {
          return JSON.parse(savedStats);
        } catch (e) {
          console.error('Error parsing saved attendance stats:', e);
        }
      }
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If we have saved data, we're not loading initially
    if (typeof window !== 'undefined' && user?.uid) {
      const hasSavedData = localStorage.getItem(`attendance_current_status_${user.uid}`) ||
                           localStorage.getItem(`attendance_today_record_${user.uid}`) ||
                           localStorage.getItem(`attendance_stats_${user.uid}`);
      return !hasSavedData;
    }
    return true;
  });
  
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Derive employeeId from authenticated user
  const employeeId = user?.uid;
  
  // Save currentStatus to localStorage whenever it changes
  useEffect(() => {
    if (employeeId && currentStatus && typeof window !== 'undefined') {
      localStorage.setItem(`attendance_current_status_${employeeId}`, JSON.stringify(currentStatus));
    }
  }, [currentStatus, employeeId]);

  // Save todayRecord to localStorage whenever it changes
  useEffect(() => {
    if (employeeId && todayRecord && typeof window !== 'undefined') {
      localStorage.setItem(`attendance_today_record_${employeeId}`, JSON.stringify(todayRecord));
    }
  }, [todayRecord, employeeId]);

  // Save stats to localStorage whenever it changes
  useEffect(() => {
    if (employeeId && stats && typeof window !== 'undefined') {
      localStorage.setItem(`attendance_stats_${employeeId}`, JSON.stringify(stats));
    }
  }, [stats, employeeId]);

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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0); // Normalize to start of day
      
      // Ensure valid date range
      if (startOfMonth > today) {
        console.warn('Invalid date range for stats:', { start: startOfMonth, end: today });
        return;
      }
      
      const monthStats = await attendanceService.getAttendanceStats(employeeId, {
        start: startOfMonth,
        end: today
      });
      setStats(monthStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to load attendance statistics';
      console.warn('Failed to fetch stats:', err);
      setStatsError(errorMessage);
      // Don't set main error state for stats failure to avoid UI disruption
      // The stats card can handle null stats and error gracefully
    }
  }, [employeeId]);

  // Clock in
  const clockIn = useCallback(async (data: ClockInData): Promise<AttendanceRecord | null> => {
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }
    
    // Check if we're in a secure context for location access
    if (data.location && !isSecureContext) {
      throw new Error('Location access requires a secure connection (HTTPS). Please access this application via HTTPS or localhost.');
    }
    
    try {
      setIsLoading(true);
      // Add employee info to the clock in data
      const employeeName = userProfile?.displayName || user?.email?.split('@')[0] || 'Employee';
      const clockInData = {
        ...data,
        employeeId,
        employeeName,
      };
      const record = await attendanceService.clockIn(clockInData);
      
      if (record === null) {
        // Employee was already clocked in, just refresh the status
        await fetchCurrentStatus();
        return null; // Return null to indicate no new record was created
      }
      
      setTodayRecord(record);
      await fetchCurrentStatus();
      return record;
    } catch (err) {
      let errorMessage = 'Failed to clock in';
      
      // Handle different types of errors
      if (err && typeof err === 'object') {
        if (err.hasOwnProperty('message')) {
          errorMessage = (err as Error).message || errorMessage;
        } else if (err.hasOwnProperty('code')) {
          errorMessage = `Error: ${(err as any).code}`;
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      console.error('Clock in error details:', err);
      console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, fetchCurrentStatus]);

  // Clock out
  const clockOut = useCallback(async (data: ClockOutData) => {
    let recordId = currentStatus?.currentRecordId;
    
    // If we don't have the record ID from current status, try to get today's active record
    if (!recordId && employeeId) {
      try {
        const todayStatus = await attendanceService.getCurrentStatus(employeeId);
        recordId = todayStatus.currentRecordId;
      } catch (err) {
        console.error('Error fetching current status for clock out:', err);
      }
    }
    
    if (!recordId) {
      throw new Error('No active clock-in record found');
    }
    
    // Check if we're in a secure context for location access
    if (data.location && !isSecureContext) {
      throw new Error('Location access requires a secure connection (HTTPS). Please access this application via HTTPS or localhost.');
    }
    
    try {
      setIsLoading(true);
      const record = await attendanceService.clockOut(recordId, data);
      setTodayRecord(record);
      await fetchCurrentStatus();
      
      // Clear cached attendance data after clocking out
      if (employeeId && typeof window !== 'undefined') {
        localStorage.removeItem(`attendance_current_status_${employeeId}`);
        localStorage.removeItem(`attendance_today_record_${employeeId}`);
        localStorage.removeItem(`attendance_stats_${employeeId}`);
      }
      
      return record;
    } catch (err) {
      let errorMessage = 'Failed to clock out';
      
      // Handle different types of errors
      if (err && typeof err === 'object') {
        if (err.hasOwnProperty('message')) {
          errorMessage = (err as Error).message || errorMessage;
        } else if (err.hasOwnProperty('code')) {
          errorMessage = `Error: ${(err as any).code}`;
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      console.error('Clock out error details:', err);
      console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentStatus?.currentRecordId, employeeId, fetchCurrentStatus]);

  // Start break
  const startBreak = useCallback(async (recordId: string) => {
    if (!recordId) {
      throw new Error('No active attendance record found');
    }
    
    try {
      await attendanceService.startBreak(recordId);
      await fetchCurrentStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start break';
      setError(message);
      console.error('Start break error:', err);
      throw new Error(message);
    }
  }, [fetchCurrentStatus]);

  // End break
  const endBreak = useCallback(async (recordId: string, breakId?: string) => {
    if (!recordId) {
      throw new Error('No active attendance record found');
    }
    
    try {
      await attendanceService.endBreak(recordId);
      await fetchCurrentStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end break';
      setError(message);
      console.error('End break error:', err);
      throw new Error(message);
    }
  }, [fetchCurrentStatus]);

  useEffect(() => {
    if (employeeId && !authLoading) {
      fetchCurrentStatus();
      fetchStats();
    } else {
      // Reset stats when no employeeId is provided (e.g., not authenticated)
      setStats(null);
      setCurrentStatus(null);
      setTodayRecord(null);
      
      // Clear cached data when user is not authenticated
      if (employeeId && typeof window !== 'undefined') {
        localStorage.removeItem(`attendance_current_status_${employeeId}`);
        localStorage.removeItem(`attendance_today_record_${employeeId}`);
        localStorage.removeItem(`attendance_stats_${employeeId}`);
      }
    }
  }, [employeeId, authLoading, fetchCurrentStatus, fetchStats]);
  
  // Clean up cached data when component unmounts
  useEffect(() => {
    return () => {
      if (employeeId && typeof window !== 'undefined') {
        // Don't clear if user is still clocked in, otherwise clear cached data
        if (currentStatus?.isClockedIn !== true) {
          localStorage.removeItem(`attendance_current_status_${employeeId}`);
          localStorage.removeItem(`attendance_today_record_${employeeId}`);
          localStorage.removeItem(`attendance_stats_${employeeId}`);
        }
      }
    };
  }, [employeeId, currentStatus]);

  return {
    currentStatus,
    todayRecord,
    stats,
    isLoading,
    error,
    statsError,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    refetch: fetchCurrentStatus
  };
}