'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, X, Circle, Download } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AttendanceExportModal } from './AttendanceExportModal';

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

interface DayStatus {
  date: Date;
  status: 'present' | 'absent' | 'approved-leave' | 'unapproved-leave' | 'half-day' | 'upcoming' | 'holiday';
  clockIn?: Date;
  clockOut?: Date;
  duration?: string;
  leaveType?: 'full' | 'half';
  leaveStatus?: 'approved' | 'pending' | 'rejected';
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
}

export function AttendanceCalendarModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: AttendanceCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Map<string, DayStatus>>(new Map());
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch attendance data for the current month
  useEffect(() => {
    if (isOpen && employeeId) {
      fetchMonthAttendance();
      fetchHolidays();
    }
  }, [isOpen, employeeId, currentMonth]);

  const fetchHolidays = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'holidays'));
      const holidayDates = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const date = doc.data().date;
        if (date) {
          holidayDates.add(date);
        }
      });
      
      setHolidays(holidayDates);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchMonthAttendance = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', employeeId),
        where('clockIn', '>=', Timestamp.fromDate(startOfMonth)),
        where('clockIn', '<=', Timestamp.fromDate(endOfMonth))
      );

      const snapshot = await getDocs(q);
      const dataMap = new Map<string, DayStatus>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const clockIn = data.clockIn?.toDate();
        const clockOut = data.clockOut?.toDate();
        
        if (clockIn) {
          // Create date key in local timezone (YYYY-MM-DD format)
          const year = clockIn.getFullYear();
          const month = String(clockIn.getMonth() + 1).padStart(2, '0');
          const day = String(clockIn.getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          
          // Calculate duration
          let duration = 'In Progress';
          if (clockOut) {
            const diffMs = clockOut.getTime() - clockIn.getTime();
            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            duration = `${hours}h ${minutes}m`;
          }

          dataMap.set(dateKey, {
            date: clockIn,
            status: 'present',
            clockIn,
            clockOut,
            duration,
          });
        }
      });

      setAttendanceData(dataMap);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get days in month
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get status for a specific date
  const getDateStatus = (date: Date): DayStatus => {
    // Create date key in local timezone (YYYY-MM-DD format)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Check if it's a future date
    if (checkDate > today) {
      return { date, status: 'upcoming' };
    }

    // Check if it's a holiday from the holidays collection
    if (holidays.has(dateKey)) {
      return { date, status: 'holiday' };
    }

    // Check if it's Sunday (Sunday = 0) - only day off
    // Sundays are always holidays, even if there's attendance data
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      return { date, status: 'holiday' };
    }

    // Check if attendance record exists
    if (attendanceData.has(dateKey)) {
      return attendanceData.get(dateKey)!;
    }

    // If it's a past weekday with no record, mark as absent
    return { date, status: 'absent' };
  };

  // Get color for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500';
      case 'absent':
        return 'bg-red-500';
      case 'approved-leave':
        return 'bg-green-300';
      case 'unapproved-leave':
        return 'bg-red-500';
      case 'half-day':
        return 'bg-green-300';
      case 'upcoming':
        return 'bg-white border-2 border-gray-300';
      case 'holiday':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Get box background color for status
  const getBoxColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 border-green-600';
      case 'absent':
        return 'bg-red-500 border-red-600';
      case 'approved-leave':
        return 'bg-green-300 border-green-400';
      case 'unapproved-leave':
        return 'bg-red-500 border-red-600';
      case 'half-day':
        return 'bg-green-300 border-green-400';
      case 'upcoming':
        return 'bg-white border-gray-200';
      case 'holiday':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-white border-gray-200';
    }
  };

  // Navigate months
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Calculate statistics
  const calculateStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let present = 0;
    let absent = 0;
    let leaves = 0;
    let workingDays = 0;

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      
      // Only count up to today
      if (date > today) break;
      
      // Create date key in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayStr}`;
      
      const dayOfWeek = date.getDay();
      
      // Skip Sundays (0) and holidays - not working days
      if (dayOfWeek === 0 || holidays.has(dateKey)) continue;
      
      workingDays++;
      const status = getDateStatus(date);
      
      if (status.status === 'present') present++;
      else if (status.status === 'absent') absent++;
      else if (status.status === 'approved-leave' || status.status === 'unapproved-leave') leaves++;
    }

    const attendanceRate = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

    return { present, absent, leaves, workingDays, attendanceRate };
  };

  const stats = calculateStats();
  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <DialogTitle className="flex items-center gap-2 flex-1 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Attendance Calendar - {employeeName}
            </DialogTitle>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto sm:mr-8"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Month Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="flex items-center gap-1 w-full sm:w-auto"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Today
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="flex items-center gap-1 w-full sm:w-auto"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                <span className="text-xs font-medium text-green-900">Present</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.present}</div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                <span className="text-xs font-medium text-red-900">Absent</span>
              </div>
              <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Circle className="w-3 h-3 fill-green-300 text-green-300" />
                <span className="text-xs font-medium text-green-900">Approved Leave</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.leaves}</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-blue-900">Working Days</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats.workingDays}</div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-purple-900">Attendance</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats.attendanceRate}%</div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Week day headers - Hidden on mobile */}
            <div className="hidden sm:grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="p-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="p-2 border-b border-r border-gray-100" />;
                }

                const status = getDateStatus(date);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    className={`relative p-1 sm:p-2 border min-h-[60px] sm:min-h-[80px] transition-all ${
                      getBoxColor(status.status)
                    } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                        status.status === 'present' ? 'text-white' :
                        status.status === 'absent' ? 'text-white' :
                        status.status === 'approved-leave' ? 'text-gray-700' :
                        status.status === 'unapproved-leave' ? 'text-white' :
                        status.status === 'half-day' ? 'text-gray-700' :
                        status.status === 'holiday' ? 'text-white' :
                        'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </div>
                      
                      {status.status === 'upcoming' && (
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-dark flex items-center justify-center">
                            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-gray-dark"></div>
                          </div>
                        </div>
                      )}

                      {status.clockIn && (
                        <div className="mt-1 text-[10px] sm:text-xs text-white text-center font-medium">
                          <div className="hidden sm:block">{status.clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                          {status.duration && status.duration !== 'In Progress' && (
                            <div className="text-[10px] sm:text-xs hidden sm:block">{status.duration}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {isToday && (
                      <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                        <span className="inline-flex items-center px-1 py-0.5 sm:px-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-600 text-white">
                          Today
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border border-green-600"></div>
              <span className="text-gray-700 dark:text-gray-300">Present</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 border border-red-600"></div>
              <span className="text-gray-700 dark:text-gray-300">Absent</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-300 border border-green-400"></div>
              <span className="text-gray-700 dark:text-gray-300">Approved Leave</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-300 border border-green-400"></div>
              <span className="text-gray-700 dark:text-gray-300">Half Day</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 border border-red-600"></div>
              <span className="text-gray-700 dark:text-gray-300">Unapproved Leave</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white dark:bg-gray-dark border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-white dark:bg-gray-dark"></div>
              </div>
              <span className="text-gray-700 dark:text-gray-300">Upcoming</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 border border-blue-600"></div>
              <span className="text-gray-700 dark:text-gray-300">Sunday/Holiday</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Export Modal */}
      <AttendanceExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        preSelectedEmployeeId={employeeId}
        preSelectedStartDate={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)}
        preSelectedEndDate={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)}
      />
    </Dialog>
  );
}
