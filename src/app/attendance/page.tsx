'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GeolocationAttendanceTracker } from '@/components/attendance';
import { History, ArrowRight } from 'lucide-react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { ClockIcon, PlayIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function AttendancePage() {
  const { user, userProfile, loading: authLoading } = useEnhancedAuth();

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
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance Tracking</h1>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-fit">
              <PlayIcon className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Track your time with geolocation verification</p>
        </div>
        <Button 
          onClick={() => window.location.href = '/attendance/history'}
          variant="outline"
          className="flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <History className="h-4 w-4" />
          <span className="sm:inline">View History</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Geolocation Attendance Tracker */}
      <div className="flex flex-col items-center justify-center py-4 sm:py-8">
        <GeolocationAttendanceTracker key="geolocation-tracker" />
      </div>
      
      {/* About Section */}
      <Card className="max-w-2xl mx-auto mt-4 sm:mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPinIcon className="h-5 w-5" />
            About Geolocation Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm sm:text-base text-gray-700">
            This geolocation-based attendance system tracks your location when clocking in and out. 
            Your location data is securely stored and used for attendance verification purposes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Location Required</p>
                <p className="text-gray-600 text-xs sm:text-sm">Browser location permission is needed for clock-in/out</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Privacy Protected</p>
                <p className="text-gray-600 text-xs sm:text-sm">Location data is only stored for attendance records</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Real-time Tracking</p>
                <p className="text-gray-600 text-xs sm:text-sm">Instant status updates and location verification</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Mobile Friendly</p>
                <p className="text-gray-600 text-xs sm:text-sm">Works on smartphones and tablets for remote workers</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}