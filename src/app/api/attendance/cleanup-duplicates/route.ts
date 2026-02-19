import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Admin access required');
    }

    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    console.log('Cleaning up duplicate records for employee:', employeeId);
    await attendanceAdminService.cleanupDuplicateRecords(employeeId);

    return NextResponse.json(
      { message: 'Duplicate records cleaned up successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to cleanup duplicate records' },
      { status: 500 }
    );
  }
}