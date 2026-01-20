import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';

export async function POST(request: NextRequest) {
  try {
    const { employeeId } = await request.json();
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    console.log('Cleaning up duplicate records for employee:', employeeId);
    await attendanceService.cleanupDuplicateRecords(employeeId);
    
    return NextResponse.json(
      { message: 'Duplicate records cleaned up successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to cleanup duplicate records',
      },
      { status: 500 }
    );
  }
}