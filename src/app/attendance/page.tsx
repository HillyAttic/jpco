'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ClockInOutWidget,
  AttendanceStatsCard,
  AttendanceCalendar,
  TeamAttendanceOverview,
  LeaveRequestModal,
  AttendanceReportGenerator
} from '@/components/attendance';
import { useAttendance } from '@/hooks/use-attendance';
import { CalendarDaysIcon, ClockIcon, UserGroupIcon, DocumentChartBarIcon, PlayIcon } from '@heroicons/react/24/outline';

export default function AttendancePage() {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  
  // For demo purposes, using a mock employee ID
  // In a real app, this would come from authentication context
  const mockEmployeeId = 'demo-employee-123';
  const mockEmployeeName = 'Demo Employee';
  
  const {
    currentStatus,
    todayRecord,
    stats,
    isLoading,
    error,
    clockIn,
    clockOut,
    startBreak,
    endBreak
  } = useAttendance(demoMode ? undefined : mockEmployeeId);

  // Demo data for when Firebase is not connected
  const demoStats = {
    totalHours: 168.5,
    averageHours: 8.2,
    attendanceRate: 95.5,
    punctualityRate: 88.2,
    overtimeHours: 12.5,
    totalDays: 22,
    presentDays: 21,
    absentDays: 1,
    lateDays: 3,
    earlyDepartures: 1
  };

  const demoCurrentStatus = {
    isClockedIn: false,
    isOnBreak: false,
    clockInTime: null,
    breakStartTime: null,
    breakDuration: 0,
    currentRecordId: null,
    currentBreakId: null
  };

  if (isLoading && !demoMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
            {demoMode && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <PlayIcon className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </div>
          <p className="text-gray-600 mt-2">Track your time and manage attendance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowLeaveModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Request Leave
          </Button>
          <Button 
            variant="outline"
            onClick={() => setDemoMode(!demoMode)}
          >
            {demoMode ? 'Connect Firebase' : 'Demo Mode'}
          </Button>
        </div>
      </div>

      {/* Demo Mode Notice */}
      {demoMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <PlayIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">Demo Mode Active</p>
                <p className="text-blue-700 text-sm mt-1">
                  This is a demonstration of the attendance system. Click "Connect Firebase" to use real data, 
                  or explore the interface with sample data below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && !demoMode && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <UserGroupIcon className="h-4 w-4" />
            Team View
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <DocumentChartBarIcon className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clock In/Out Widget */}
            <div className="lg:col-span-1">
              {demoMode ? (
                <Card className="p-6">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ClockIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-semibold">Not Clocked In</h3>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg"
                      onClick={() => alert('Demo mode - Clock in functionality disabled')}
                    >
                      <ClockIcon className="mr-2 h-5 w-5" />
                      Clock In (Demo)
                    </Button>
                    <div className="text-center text-sm text-gray-500">
                      Connect to Firebase to enable real clock in/out
                    </div>
                  </div>
                </Card>
              ) : (
                <ClockInOutWidget
                  currentStatus={currentStatus}
                  onClockIn={async (data) => {
                    await clockIn({
                      ...data,
                      employeeId: mockEmployeeId,
                      employeeName: mockEmployeeName
                    });
                  }}
                  onClockOut={async (data) => {
                    await clockOut({
                      ...data,
                      employeeId: mockEmployeeId,
                      employeeName: mockEmployeeName
                    });
                  }}
                  onStartBreak={async () => {
                    if (currentStatus?.currentRecordId) {
                      await startBreak(currentStatus.currentRecordId);
                    }
                  }}
                  onEndBreak={async () => {
                    if (currentStatus?.currentRecordId && currentStatus?.currentBreakId) {
                      await endBreak(currentStatus.currentRecordId, currentStatus.currentBreakId);
                    }
                  }}
                  loading={isLoading}
                />
              )}
            </div>

            {/* Stats Cards */}
            <div className="lg:col-span-2">
              <AttendanceStatsCard
                stats={demoMode ? demoStats : stats}
                loading={isLoading && !demoMode}
              />
            </div>
          </div>

          {/* Today's Record */}
          {(todayRecord || demoMode) && (
            <Card>
              <CardHeader>
                <CardTitle>Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {demoMode ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Clock In</p>
                      <p className="font-medium">09:00 AM</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Clock Out</p>
                      <p className="font-medium">06:00 PM</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Hours</p>
                      <p className="font-medium">8.5h</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium capitalize">Completed</p>
                    </div>
                  </div>
                ) : todayRecord ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Clock In</p>
                      <p className="font-medium">
                        {todayRecord.clockIn.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Clock Out</p>
                      <p className="font-medium">
                        {todayRecord.clockOut 
                          ? todayRecord.clockOut.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : 'Not clocked out'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Hours</p>
                      <p className="font-medium">{todayRecord.totalHours.toFixed(2)}h</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium capitalize">{todayRecord.status}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          {demoMode ? (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Attendance Calendar</h3>
                  <p className="text-gray-600">Connect to Firebase to view your attendance calendar</p>
                </div>
                <Button variant="outline" onClick={() => setDemoMode(false)}>
                  Connect Firebase
                </Button>
              </div>
            </Card>
          ) : (
            <AttendanceCalendar
              employeeId={mockEmployeeId}
              month={new Date().getMonth()}
              year={new Date().getFullYear()}
            />
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          {demoMode ? (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Team Attendance</h3>
                  <p className="text-gray-600">Connect to Firebase to view team attendance overview</p>
                </div>
                <Button variant="outline" onClick={() => setDemoMode(false)}>
                  Connect Firebase
                </Button>
              </div>
            </Card>
          ) : (
            <TeamAttendanceOverview />
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          {demoMode ? (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <DocumentChartBarIcon className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Attendance Reports</h3>
                  <p className="text-gray-600">Connect to Firebase to generate attendance reports</p>
                </div>
                <Button variant="outline" onClick={() => setDemoMode(false)}>
                  Connect Firebase
                </Button>
              </div>
            </Card>
          ) : (
            <AttendanceReportGenerator
              employeeId={mockEmployeeId}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Leave Request Modal */}
      <LeaveRequestModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        onSubmit={async (data) => {
          // In demo mode, just show an alert
          if (demoMode) {
            alert(`Demo: Leave request submitted for ${data.reason}`);
            return;
          }
          // In real mode, this would call the leave service
          console.log('Leave request:', data);
        }}
        leaveTypes={demoMode ? [
          { id: '1', name: 'Annual Leave', maxDays: 25, carryOverDays: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', name: 'Sick Leave', maxDays: 10, carryOverDays: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '3', name: 'Personal Leave', maxDays: 5, carryOverDays: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() }
        ] : []}
        leaveBalances={demoMode ? [
          { id: '1', employeeId: mockEmployeeId, leaveTypeId: '1', totalDays: 25, usedDays: 8, remainingDays: 17, year: new Date().getFullYear() },
          { id: '2', employeeId: mockEmployeeId, leaveTypeId: '2', totalDays: 10, usedDays: 2, remainingDays: 8, year: new Date().getFullYear() },
          { id: '3', employeeId: mockEmployeeId, leaveTypeId: '3', totalDays: 5, usedDays: 1, remainingDays: 4, year: new Date().getFullYear() }
        ] : []}
        loading={false}
      />
    </div>
  );
}