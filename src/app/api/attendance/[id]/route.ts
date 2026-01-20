import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Attendance record ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting attendance record with ID:', id);
    await attendanceService.deleteAttendanceRecord(id);
    
    // Create response with cache control to prevent caching
    const response = NextResponse.json(
      { message: 'Attendance record deleted successfully' },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
    
    return response;
  } catch (error: any) {
    console.error('Delete attendance error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to delete attendance record',
      },
      { status: 500 }
    );
  }
}