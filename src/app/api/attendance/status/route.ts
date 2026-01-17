import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';

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

    // Get employee ID from query params
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get current status
    const status = await attendanceService.getCurrentStatus(employeeId);

    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error('Get status error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to get attendance status',
      },
      { status: 500 }
    );
  }
}
