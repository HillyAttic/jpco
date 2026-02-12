'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LocationMapModal } from '@/components/attendance/LocationMapModal';
import { AttendanceExportModal } from '@/components/attendance/AttendanceExportModal';
import { AttendanceCalendarModal } from '@/components/attendance/AttendanceCalendarModal';
import { HolidayManagementModal } from '@/components/attendance/HolidayManagementModal';
import { ManagerGuard } from '@/components/Auth/PermissionGuard';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Download,
  ShieldAlert,
  FullscreenIcon
} from 'lucide-react';
import { employeeService } from '@/services/employee.service';
import { inMemoryPersistence } from 'firebase/auth/cordova';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  location?: {
    clockIn?: { latitude: number; longitude: number };
    clockOut?: { latitude: number; longitude: number };
  };
  totalHours: number;
  status: 'active' | 'completed' | 'incomplete';
  createdAt: Date;
  updatedAt: Date;
}

interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Admin' | 'Employee';
  status: 'active' | 'on-leave' | 'terminated';
}

export default function AttendanceTrayPage() {
  const { user, userProfile } = useEnhancedAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const itemsPerPage = 20;
  
  // Filter states
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // State for location map modal
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; title: string } | null>(null);
  
  // State for export modal
  const [showExportModal, setShowExportModal] = useState(false);
  
  // State for calendar modal
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<{ id: string; name: string } | null>(null);
  
  // State for holiday management modal
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Convert Firestore timestamp to Date
  const convertTimestamps = (record: any): AttendanceRecord => {
    const convertTimestamp = (timestamp: any): Date | undefined => {
      if (!timestamp) return undefined;
      
      try {
        if (timestamp instanceof Date) return timestamp;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
          return new Date(timestamp.seconds * 1000);
        }
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? undefined : date;
        }
        return undefined;
      } catch (error) {
        console.error('Error converting timestamp:', error, timestamp);
        return undefined;
      }
    };
    
    return {
      ...record,
      clockIn: convertTimestamp(record.clockIn),
      clockOut: convertTimestamp(record.clockOut),
      createdAt: convertTimestamp(record.createdAt),
      updatedAt: convertTimestamp(record.updatedAt),
    };
  };

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    try {
      const allEmployees = await employeeService.getAll();
      setEmployees(allEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  // Fetch attendance records
  const fetchAttendanceHistory = useCallback(async (page = 1) => {
    setLoading(true);
    
    try {
      let q = query(
        collection(db, 'attendance-records'),
        orderBy('clockIn', 'desc'),
        limit(page * itemsPerPage)
      );

      // Apply employee filter
      if (selectedEmployee !== 'all') {
        q = query(
          collection(db, 'attendance-records'),
          where('employeeId', '==', selectedEmployee),
          orderBy('clockIn', 'desc'),
          limit(page * itemsPerPage)
        );
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (dateFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }

        if (selectedEmployee !== 'all') {
          q = query(
            collection(db, 'attendance-records'),
            where('employeeId', '==', selectedEmployee),
            where('clockIn', '>=', Timestamp.fromDate(startDate)),
            orderBy('clockIn', 'desc'),
            limit(page * itemsPerPage)
          );
        } else {
          q = query(
            collection(db, 'attendance-records'),
            where('clockIn', '>=', Timestamp.fromDate(startDate)),
            orderBy('clockIn', 'desc'),
            limit(page * itemsPerPage)
          );
        }
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setAttendances([]);
        setHasMoreData(false);
      } else {
        const allRecords = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          return convertTimestamps(data);
        });
        
        // Apply status filter client-side
        let filteredRecords = allRecords;
        if (selectedStatus !== 'all') {
          filteredRecords = allRecords.filter(record => {
            if (selectedStatus === 'active') return !record.clockOut;
            if (selectedStatus === 'completed') return !!record.clockOut;
            return true;
          });
        }
        
        // Get the records for the current page
        const startIndex = (page - 1) * itemsPerPage;
        const pageRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);
        
        setAttendances(pageRecords);
        setHasMoreData(filteredRecords.length > page * itemsPerPage);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [selectedEmployee, selectedStatus, dateFilter]);

  // Load initial data
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAttendanceHistory(currentPage);
  }, [fetchAttendanceHistory, currentPage, selectedEmployee, selectedStatus, dateFilter]);

  // Format time for display
  const formatTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Time';
      return validDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Error';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Date';
      return validDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Error';
    }
  };

  // Calculate duration
  const calculateDuration = (clockIn: Date, clockOut?: Date) => {
    try {
      if (!clockIn || isNaN(clockIn.getTime())) return 'Invalid Start Time';
      if (!clockOut) return 'In Progress';
      if (isNaN(clockOut.getTime())) return 'Invalid End Time';
            
      const diffMs = clockOut.getTime() - clockIn.getTime();
      if (diffMs < 0) return 'Negative Duration';
            
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
            
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return 'Calculation Error';
    }
  };

  // Get status badge
  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record.clockIn) {
      return <Badge variant="secondary">Not Clocked In</Badge>;
    } else if (record.clockOut) {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    } else {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge>;
    }
  };

  // Handle location click
  const handleLocationClick = (latitude: number, longitude: number, title: string) => {
    setSelectedLocation({ latitude, longitude, title });
    setShowMapModal(true);
  };

  // Handle calendar overview click
  const handleCalendarClick = (employeeId: string, employeeName: string) => {
    setSelectedEmployeeForCalendar({ id: employeeId, name: employeeName });
    setShowCalendarModal(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view attendance tray.</p>
          <Button 
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign In to Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ManagerGuard
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
            <ShieldAlert className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            You don't have permission to access this page. Only managers and administrators can view the attendance tray.
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Attendance Tray</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">View attendance history for all employees</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHolidayModal(true)}
            className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <Calendar className="h-4 w-4" />
            Manage Holidays
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(1);
              fetchAttendanceHistory(1);
            }}
            className="flex items-center gap-1"
          >
            <Loader2 className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      {attendances.length === 0 && !loading && !isInitialLoad ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Attendance Records</h3>
            <p className="text-gray-600 dark:text-gray-400">No attendance records found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attendances.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Employee Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{record.employeeName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(record.clockIn)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clock In</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatTime(record.clockIn)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clock Out</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatTime(record.clockOut)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                      <p className="font-medium text-gray-900 dark:text-white">{calculateDuration(record.clockIn, record.clockOut)}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    {getStatusBadge(record)}
                  </div>
                </div>

                {/* Location Info */}
                {(record.location?.clockIn || record.location?.clockOut) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        {record.location?.clockIn && (
                          <button
                            onClick={() => handleLocationClick(
                              record.location!.clockIn!.latitude,
                              record.location!.clockIn!.longitude,
                              `${record.employeeName} - Clock In Location`
                            )}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <MapPin className="h-3 w-3" />
                            <span>In: {record.location.clockIn.latitude.toFixed(4)}, {record.location.clockIn.longitude.toFixed(4)}</span>
                          </button>
                        )}
                        {record.location?.clockOut && (
                          <button
                            onClick={() => handleLocationClick(
                              record.location!.clockOut!.latitude,
                              record.location!.clockOut!.longitude,
                              `${record.employeeName} - Clock Out Location`
                            )}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            <MapPin className="h-3 w-3" />
                            <span>Out: {record.location.clockOut.latitude.toFixed(4)}, {record.location.clockOut.longitude.toFixed(4)}</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Calendar Overview Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCalendarClick(record.employeeId, record.employeeName)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Calendar className="h-3 w-3" />
                        Calendar Overview
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-8">
            <Button 
              onClick={() => {
                const prevPage = Math.max(1, currentPage - 1);
                setCurrentPage(prevPage);
              }}
              disabled={currentPage <= 1 || loading}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} {hasMoreData ? 'of many' : ''}
              </span>
            </div>
          
            <Button 
              onClick={() => {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
              }}
              disabled={!hasMoreData || loading}
              variant="outline"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">Loading records...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Location Map Modal */}
      {selectedLocation && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => {
            setShowMapModal(false);
            setSelectedLocation(null);
          }}
          latitude={selectedLocation.latitude}
          longitude={selectedLocation.longitude}
          title={selectedLocation.title}
        />
      )}

      {/* Export Modal */}
      <AttendanceExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Calendar Overview Modal */}
      {selectedEmployeeForCalendar && (
        <AttendanceCalendarModal
          isOpen={showCalendarModal}
          onClose={() => {
            setShowCalendarModal(false);
            setSelectedEmployeeForCalendar(null);
          }}
          employeeId={selectedEmployeeForCalendar.id}
          employeeName={selectedEmployeeForCalendar.name}
        />
      )}

      {/* Holiday Management Modal */}
      <HolidayManagementModal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
      />
    </div>
  </ManagerGuard>
  );
}
