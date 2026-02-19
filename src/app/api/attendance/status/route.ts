import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const status = await attendanceAdminService.getCurrentStatus(employeeId);

    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to get attendance status' },
      { status: 500 }
    );
  }
}
