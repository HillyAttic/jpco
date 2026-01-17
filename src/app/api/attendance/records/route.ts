import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';
import { AttendanceFilters } from '@/types/attendance.types';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: AttendanceFilters = {
      employeeId: searchParams.get('employeeId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      status: searchParams.get('status') as any,
      page: searchParams.get('page')
        ? parseInt(searchParams.get('page')!)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
    };

    // Get attendance records
    const records = await attendanceService.getAttendanceRecords(filters);

    return NextResponse.json(records, { status: 200 });
  } catch (error: any) {
    console.error('Get records error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to get attendance records',
      },
      { status: 500 }
    );
  }
}
