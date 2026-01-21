'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';

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

export default function AttendanceHistoryPage() {
  const { user } = useEnhancedAuth();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const itemsPerPage = 10;
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  
  // State for bulk selection
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deletingBulkRecords, setDeletingBulkRecords] = useState(false);

  // Delete functions
  const confirmDelete = (record: AttendanceRecord) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setRecordToDelete(null);
  };

  const deleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      setDeletingRecordId(recordToDelete.id);
      
      const response = await fetch(`/api/attendance/${recordToDelete.id}?t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        // Remove the deleted record from the local state
        setAttendances(attendances.filter(record => record.id !== recordToDelete.id));
        setShowDeleteModal(false);
        setRecordToDelete(null);
        
        // Refresh the data after a brief moment to ensure indexes are updated
        setTimeout(() => {
          if (user?.uid) {
            fetchAttendanceHistory(currentPage);
          }
        }, 500);
      } else {
        console.error('Failed to delete record:', await response.text());
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    } finally {
      setDeletingRecordId(null);
    }
  };

  // Bulk selection functions
  const toggleSelectRecord = (id: string) => {
    setSelectedRecords(prev => 
      prev.includes(id) 
        ? prev.filter(recordId => recordId !== id)
        : [...prev, id]
    );
  };

  const selectAllRecords = () => {
    if (selectedRecords.length === attendances.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(attendances.map(record => record.id));
    }
  };

  const confirmBulkDelete = () => {
    setShowBulkDeleteModal(true);
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
  };

  const bulkDeleteRecords = async () => {
    if (selectedRecords.length === 0) return;

    try {
      setDeletingBulkRecords(true);
      
      // Delete each selected record
      const deletePromises = selectedRecords.map(id =>
        fetch(`/api/attendance/${id}?t=${Date.now()}`, { 
          method: 'DELETE',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
      );
      
      const responses = await Promise.all(deletePromises);
      const successfulDeletes = responses.filter(response => response.ok);
      
      if (successfulDeletes.length > 0) {
        // Remove deleted records from local state
        setAttendances(attendances.filter(record => 
          !selectedRecords.includes(record.id)
        ));
        
        // Clear selections
        setSelectedRecords([]);
        setShowBulkDeleteModal(false);
        
        // Refresh the data after a brief moment to ensure indexes are updated
        setTimeout(() => {
          if (user?.uid) {
            fetchAttendanceHistory(currentPage);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error bulk deleting records:', error);
    } finally {
      setDeletingBulkRecords(false);
    }
  };

  // Convert Firestore timestamp to Date
  const convertTimestamps = (record: any): AttendanceRecord => {
    // Helper function to safely convert timestamp
    const convertTimestamp = (timestamp: any): Date | undefined => {
      if (!timestamp) return undefined;
      
      try {
        // If it's already a Date object
        if (timestamp instanceof Date) {
          return timestamp;
        }
        
        // If it has toDate() method (Firestore Timestamp)
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        
        // If it's a Firestore Timestamp-like object with seconds
        if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
          return new Date(timestamp.seconds * 1000);
        }
        
        // If it's a string or number, try to create Date
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? undefined : date;
        }
        
        // Fallback
        return undefined;
      } catch (error) {
        console.error('Error converting timestamp:', error, timestamp);
        return undefined;
      }
    };
    
    const convertedRecord = {
      ...record,
      clockIn: convertTimestamp(record.clockIn),
      clockOut: convertTimestamp(record.clockOut),
      createdAt: convertTimestamp(record.createdAt),
      updatedAt: convertTimestamp(record.updatedAt),
    };
    
    return convertedRecord;
  };

  const fetchAttendanceHistory = useCallback(async (page = 1) => {
    if (!user?.uid) return;

    setLoading(true);
    
    try {
      let q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', user.uid),
        orderBy('clockIn', 'desc'),
        limit(page * itemsPerPage)
      );

      // Force a fresh fetch by using a fresh query
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setAttendances([]);
        setHasMoreData(false);
      } else {
        const allRecords = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          console.log('Raw Firestore data:', data);
          const converted = convertTimestamps(data);
          console.log('Converted data:', converted);
          return converted;
        });
        
        // Get the records for the current page
        const startIndex = (page - 1) * itemsPerPage;
        const pageRecords = allRecords.slice(startIndex, startIndex + itemsPerPage);
        
        setAttendances(pageRecords);
        
        // Check if there are more records
        setHasMoreData(allRecords.length > page * itemsPerPage);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user?.uid]);

  // Load initial data
  useEffect(() => {
    if (user?.uid) {
      fetchAttendanceHistory();
    }
  }, [user?.uid, fetchAttendanceHistory]);



  // Format time for display
  const formatTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    try {
      // Ensure we have a valid Date object
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Time';
      return validDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error, date);
      return 'Error';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    try {
      // Ensure we have a valid Date object
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Date';
      return validDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Error';
    }
  };

  // Format datetime for display
  const formatDateTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    try {
      // Ensure we have a valid Date object
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) return 'Invalid Date';
      return validDate.toLocaleString();
    } catch (error) {
      console.error('Error formatting datetime:', error, date);
      return 'Error';
    }
  };

  // Calculate duration between clock in and clock out
  const calculateDuration = React.useCallback((clockIn: Date, clockOut?: Date) => {
    try {
      // Validate inputs
      if (!clockIn || isNaN(clockIn.getTime())) return 'Invalid Start Time';
      if (!clockOut) return 'In Progress';
      if (isNaN(clockOut.getTime())) return 'Invalid End Time';
            
      const diffMs = clockOut.getTime() - clockIn.getTime();
            
      // Handle negative durations
      if (diffMs < 0) return 'Negative Duration';
            
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
            
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error, { clockIn, clockOut });
      return 'Calculation Error';
    }
  }, []); // Empty dependency array to memoize the function

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view attendance history.</p>
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance History</h1>
          <p className="text-gray-600 mt-2">View your historical attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedRecords.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedRecords.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmBulkDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRecords([])}
              >
                Clear
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAttendanceHistory(currentPage)}
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

      {attendances.length === 0 && !loading && !isInitialLoad ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-600">You don't have any attendance records yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Header with Select All checkbox */}
          {attendances.length > 0 && (
            <div className="flex items-center gap-3 pl-6 pr-4 py-3 bg-gray-50 rounded-lg border">
              <input
                type="checkbox"
                checked={selectedRecords.length === attendances.length && attendances.length > 0}
                onChange={selectAllRecords}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {selectedRecords.length} of {attendances.length} selected
              </span>
            </div>
          )}
          
          {attendances.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => toggleSelectRecord(record.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        {formatDate(record.clockIn)}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {record.employeeName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(record)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(record)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Clock In Section */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Clock In</h4>
                      <p className="text-lg font-semibold text-gray-900">{formatTime(record.clockIn)}</p>
                      {record.location?.clockIn && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {record.location.clockIn.latitude.toFixed(4)}, {record.location.clockIn.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Clock Out Section */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-red-600 rotate-180" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Clock Out</h4>
                      <p className="text-lg font-semibold text-gray-900">{formatTime(record.clockOut)}</p>
                      {record.location?.clockOut && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {record.location.clockOut.latitude.toFixed(4)}, {record.location.clockOut.longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Duration and Stats */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-sm text-gray-500">Duration:</span>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {calculateDuration(record.clockIn, record.clockOut)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Updated: {formatDateTime(record.updatedAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-8">
            <Button 
              onClick={() => {
                const prevPage = Math.max(1, currentPage - 1);
                setCurrentPage(prevPage);
                fetchAttendanceHistory(prevPage);
              }}
              disabled={currentPage <= 1 || loading}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} {hasMoreData ? 'of many' : ''}
              </span>
            </div>
          
            <Button 
              onClick={() => {
                const nextPage = currentPage + 1;
                setCurrentPage(nextPage);
                fetchAttendanceHistory(nextPage);
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
                <span className="text-gray-600">Loading records...</span>
              </div>
            </div>
          )}
        </div>
      )}
    
      {/* Delete Confirmation Modal */}
      {showDeleteModal && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this attendance record?
            </p>
            
            <p className="text-sm text-gray-500 mb-6">
              Date: {formatDate(recordToDelete.clockIn)}
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={!!deletingRecordId}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                variant="destructive"
                onClick={deleteRecord}
                disabled={!!deletingRecordId}
                className="flex-1"
              >
                {deletingRecordId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Bulk Deletion</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete these attendance records?
            </p>
            
            <p className="text-sm text-gray-500 mb-6">
              Number of records to delete: {selectedRecords.length}
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelBulkDelete}
                disabled={deletingBulkRecords}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <Button
                variant="destructive"
                onClick={bulkDeleteRecords}
                disabled={deletingBulkRecords}
                className="flex-1"
              >
                {deletingBulkRecords ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}