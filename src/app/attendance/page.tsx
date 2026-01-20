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
  AttendanceReportGenerator,
  GeolocationAttendanceTracker
} from '@/components/attendance';
import { History, ArrowRight } from 'lucide-react';
import { useAttendance } from '@/hooks/use-attendance';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { CalendarDaysIcon, ClockIcon, UserGroupIcon, DocumentChartBarIcon, PlayIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function AttendancePage() {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const { user, userProfile, loading: authLoading } = useEnhancedAuth();
  
  // Get real employee ID from authenticated user
  const employeeId = user?.uid;
  
  const {
    currentStatus,
    todayRecord,
    stats,
    isLoading,
    error,
    statsError,
    clockIn,
    clockOut,
    startBreak,
    endBreak
  } = useAttendance();

  // Show loading if auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Show authentication required message if not signed in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Access Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access the attendance tracking system.</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <PlayIcon className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
          <p className="text-gray-600 mt-2">Track your time and manage attendance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowLeaveModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Request Leave
          </Button>
          <Button 
            onClick={() => window.location.href = '/attendance/history'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View History
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="geolocation" className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" />
            Geo Tracking
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
              <ClockInOutWidget
                currentStatus={currentStatus}
                onClockIn={async (data) => {
                  return await clockIn(data);
                }}
                onClockOut={async (data) => {
                  await clockOut(data);
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
            </div>

            {/* Stats Cards */}
            <div className="lg:col-span-2">
              <AttendanceStatsCard
                stats={stats}
                loading={isLoading}
                error={statsError || undefined}
              />
            </div>
          </div>

          {/* Today's Record */}
          {todayRecord && (
            <Card>
              <CardHeader>
                <CardTitle>Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Geolocation Attendance Tab */}
        <TabsContent value="geolocation" className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <GeolocationAttendanceTracker />
          </div>
          
          <Card className="max-w-2xl mx-auto mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                About Geolocation Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                This geolocation-based attendance system tracks your location when clocking in and out. 
                Your location data is securely stored and used for attendance verification purposes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Location Required</p>
                    <p className="text-gray-600">Browser location permission is needed for clock-in/out</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Privacy Protected</p>
                    <p className="text-gray-600">Location data is only stored for attendance records</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Real-time Tracking</p>
                    <p className="text-gray-600">Instant status updates and location verification</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                  <div>
                    <p className="font-medium">Mobile Friendly</p>
                    <p className="text-gray-600">Works on smartphones and tablets for remote workers</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <AttendanceCalendar
            month={new Date()}
            days={[]}
            onDateClick={(date) => console.log('Date clicked:', date)}
            onMonthChange={(month) => console.log('Month changed:', month)}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamAttendanceOverview
            teamMembers={[]}
            onEmployeeClick={(employeeId) => console.log('Employee clicked:', employeeId)}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <AttendanceReportGenerator
            onGenerate={async (config) => {
              console.log('Generate report:', config);
            }}
            loading={false}
          />
        </TabsContent>
      </Tabs>

      {/* Leave Request Modal */}
      <LeaveRequestModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        onSubmit={async (data) => {
          // In real mode, this would call the leave service
          console.log('Leave request:', data);
        }}
        leaveTypes={[
          { 
            id: '1', 
            name: 'Annual Leave', 
            code: 'AL',
            isPaid: true,
            requiresApproval: true,
            maxDaysPerYear: 25, 
            accrualRate: 2.08,
            carryOverAllowed: true,
            color: '#3B82F6',
            isActive: true, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          },
          { 
            id: '2', 
            name: 'Sick Leave', 
            code: 'SL',
            isPaid: true,
            requiresApproval: false,
            maxDaysPerYear: 10, 
            accrualRate: 0.83,
            carryOverAllowed: false,
            color: '#EF4444',
            isActive: true, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          },
          { 
            id: '3', 
            name: 'Personal Leave', 
            code: 'PL',
            isPaid: false,
            requiresApproval: true,
            maxDaysPerYear: 5, 
            accrualRate: 0.42,
            carryOverAllowed: false,
            color: '#10B981',
            isActive: true, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          }
        ]}
        leaveBalances={[
          { 
            leaveTypeId: '1', 
            leaveTypeName: 'Annual Leave',
            totalDays: 25, 
            usedDays: 8, 
            remainingDays: 17, 
            accrualRate: 2.08,
            lastAccrualDate: new Date(),
            updatedAt: new Date()
          },
          { 
            leaveTypeId: '2', 
            leaveTypeName: 'Sick Leave',
            totalDays: 10, 
            usedDays: 2, 
            remainingDays: 8, 
            accrualRate: 0.83,
            lastAccrualDate: new Date(),
            updatedAt: new Date()
          },
          { 
            leaveTypeId: '3', 
            leaveTypeName: 'Personal Leave',
            totalDays: 5, 
            usedDays: 1, 
            remainingDays: 4, 
            accrualRate: 0.42,
            lastAccrualDate: new Date(),
            updatedAt: new Date()
          }
        ]}
        loading={false}
      />
    </div>
  );
}