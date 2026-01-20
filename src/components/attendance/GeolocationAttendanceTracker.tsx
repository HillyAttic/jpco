'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { attendanceService } from '@/services/attendance.service';
import { 
  Clock, 
  MapPin, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  RotateCcw,
  ShieldAlert,
  Wifi
} from 'lucide-react';

interface LocationData {
  lat: number | null;
  lng: number | null;
  accuracy?: number;
}

interface AttendanceStatus {
  status: 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK' | 'loading' | 'error';
  data: any;
  error?: string;
}

export function GeolocationAttendanceTracker() {
  const auth = useEnhancedAuth();
  const [status, setStatus] = useState<AttendanceStatus>(() => {
    // Always initialize as loading - we'll fetch the real status from backend
    // Don't rely on localStorage for initial state to ensure we get current data
    return { 
      status: 'loading', 
      data: null 
    };
  });
  
  const [location, setLocation] = useState<LocationData>({ 
    lat: null, 
    lng: null 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Check if we're running in a secure context (HTTPS)
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

  useEffect(() => {
    if (auth.user) {
      console.log('User authenticated, triggering cleanup and status load');
      // Clean up any duplicate records first
      cleanupDuplicateRecordsForUser(auth.user.uid);
      loadStatus();
    }
  }, [auth.user]);

  // Cleanup duplicate records for the current user
  const cleanupDuplicateRecordsForUser = async (employeeId: string) => {
    console.log('Attempting to cleanup duplicate records for:', employeeId);
    try {
      const response = await fetch('/api/attendance/cleanup-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      console.log('Cleanup API response status:', response.status);
      
      if (response.ok) {
        console.log('Duplicate records cleanup initiated');
      } else {
        console.error('Cleanup API failed:', await response.text());
      }
    } catch (error) {
      console.error('Error cleaning up duplicate records:', error);
    }
  };

  const loadStatus = async () => {
    if (!auth.user) return;
    
    try {
      setStatus({ status: 'loading', data: null });
      const result = await attendanceService.getCurrentStatus(auth.user.uid);
      
      // Check if user has already clocked in today (even if they've clocked out)
      const hasClockedInToday = await attendanceService.hasClockedInToday(auth.user.uid);
      
      // Map the service response to our status format
      let mappedStatus: AttendanceStatus['status'] = 'NOT_CLOCKED_IN';
      if (result.isClockedIn) {
        mappedStatus = result.isOnBreak ? 'ON_BREAK' : 'CLOCKED_IN';
      } else if (!result.isClockedIn && hasClockedInToday) {
        // User has already clocked in today but is not currently clocked in
        mappedStatus = 'CLOCKED_OUT';
      }
      
      setStatus({
        status: mappedStatus,
        data: result
      });
    } catch (err: any) {
      setStatus({ 
        status: 'error', 
        data: null, 
        error: err.message || 'Failed to load attendance status' 
      });
    }
  };

  // Clear cached attendance data (placeholder for future use)
  const clearCachedAttendance = () => {
    // No localStorage cleanup needed since we're not using it for initialization
    console.log('Clearing cached attendance data');
  };

  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      // Check if we're in a secure context
      if (!isSecureContext) {
        reject(new Error('Location access requires a secure connection (HTTPS). Please access this application via HTTPS or localhost.'));
        return;
      }
      
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          // Only include accuracy if it's a valid number
          if (position.coords.accuracy !== undefined && 
              typeof position.coords.accuracy === 'number' && 
              !isNaN(position.coords.accuracy)) {
            locationData.accuracy = position.coords.accuracy;
          }
          
          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location services and ensure you are accessing this application via HTTPS.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. This may be due to using an insecure connection (HTTP). Please use HTTPS.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please check your connection and try again.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!auth.user) return;

    setLoading(true);
    setError('');
    
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      
      const record = await attendanceService.clockIn({
        employeeId: auth.user.uid,
        employeeName: auth.userProfile?.displayName || auth.user.email || 'User',
        timestamp: new Date(),
        location: {
          latitude: loc.lat!,
          longitude: loc.lng!
        }
      });
      
      if (record === null) {
        // User was already clocked in, just refresh the status
        setError('You are already clocked in for today');
        await loadStatus();
      } else {
        // Successfully clocked in, refresh the status
        await loadStatus();
      }
      
      // Brief pause to ensure smooth UI transition
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err: any) {
      console.error('Geolocation tracker clock in error:', err);
      setError(err.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely format clock in time
  const formatClockInTime = (clockInTime: any): string => {
    try {
      // Convert to Date object if it's not already
      const date = clockInTime instanceof Date ? clockInTime : new Date(clockInTime);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      // Format as time only (HH:MM:SS)
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting clock in time:', error);
      return 'Time unavailable';
    }
  };

  const handleClockOut = async () => {
    if (!auth.user) return;

    // Get current record ID from status or fetch it
    let recordId = status.data?.currentRecordId;
    if (!recordId) {
      try {
        const currentStatus = await attendanceService.getCurrentStatus(auth.user.uid);
        recordId = currentStatus.currentRecordId;
      } catch (err) {
        setError('Could not find current attendance record');
        return;
      }
    }

    if (!recordId) {
      setError('No active attendance record found');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      
      await attendanceService.clockOut(recordId, {
        timestamp: new Date(),
        location: {
          latitude: loc.lat!,
          longitude: loc.lng!
        }
      });
      
      // Refresh status to ensure UI is in sync with backend
      await loadStatus();
      
      // Brief pause to ensure smooth UI transition
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (err: any) {
      setError(err.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  // Component cleanup
  useEffect(() => {
    return () => {
      // Cleanup logic when component unmounts
      console.log('GeolocationAttendanceTracker unmounted');
    };
  }, []);

  const getStatusMessage = () => {
    switch (status.status) {
      case 'loading':
        return 'Loading attendance status...';
      case 'NOT_CLOCKED_IN':
        return 'Ready to clock in';
      case 'CLOCKED_IN':
        return 'Currently clocked in';
      case 'ON_BREAK':
        return 'On break';
      case 'CLOCKED_OUT':
        return 'Clocked out for today';
      case 'error':
        return status.error || 'Error loading status';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'CLOCKED_IN':
        return 'text-green-600';
      case 'ON_BREAK':
        return 'text-yellow-600';
      case 'CLOCKED_OUT':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (auth.loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading authentication...</p>
        </CardContent>
      </Card>
    );
  }

  if (!auth.user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Authentication Required</p>
          <p className="text-gray-600">Please sign in to use attendance tracking</p>
        </CardContent>
      </Card>
    );
  }
  
  // Check if we're in an insecure context and warn the user
  if (!isSecureContext) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-6 w-6" />
            <h3 className="font-semibold">Security Warning</h3>
          </div>
          
          <div className="text-sm text-gray-700 space-y-2">
            <p>Location access requires a secure connection (HTTPS).</p>
            <p>Please access this application via:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>HTTPS protocol (https://yourdomain.com)</li>
              <li>Localhost (http://localhost:3000)</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-2 text-blue-600 pt-2">
            <Wifi className="h-5 w-5" />
            <p className="text-sm">
              Current connection: <span className="font-mono">{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="text-center">
          <div className={`flex items-center justify-center gap-2 mb-2`}>
            {status.status === 'loading' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : status.status === 'CLOCKED_IN' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : status.status === 'ON_BREAK' ? (
              <Coffee className="h-5 w-5 text-yellow-500" />
            ) : status.status === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-gray-500" />
            )}
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </span>
          </div>
          
          {status.data?.clockInTime && (
            <p className="text-sm text-gray-600">
              Clocked in at {formatClockInTime(status.data.clockInTime)}
            </p>
          )}
          
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Location Info */}
        {location.lat && (
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Location Recorded</span>
            </div>
            <p className="text-xs text-blue-700">
              {location.lat?.toFixed(6)}, {location.lng?.toFixed(6)}
              {location.accuracy && ` (±${location.accuracy.toFixed(0)}m)`}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status.status === 'NOT_CLOCKED_IN' && (
            <Button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recording Clock In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Clock In
                </>
              )}
            </Button>
          )}

          {(status.status === 'CLOCKED_IN' || status.status === 'ON_BREAK') && (
            <Button
              onClick={handleClockOut}
              disabled={loading}
              variant="destructive"
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recording Clock Out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-5 w-5" />
                  Clock Out
                </>
              )}
            </Button>
          )}

          {status.status === 'CLOCKED_OUT' && (
            <div className="text-center p-4 bg-green-50 rounded-md border border-green-200">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-800">Attendance Completed</p>
              <p className="text-sm text-green-700">You're all set for today!</p>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={loadStatus}
            disabled={loading || status.status === 'loading'}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

