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

    // Use authenticated user's ID (employees can only check their own status)
    const employeeId = authResult.user.uid;

    // Use Admin SDK to get status (bypasses security rules)
    const status = await attendanceAdminService.getCurrentStatus(employeeId);
    const hasClockedIn = await attendanceAdminService.hasClockedInToday(employeeId);

    return NextResponse.json({
      success: true,
      status,
      hasClockedInToday: hasClockedIn,
    });
  } catch (error: any) {
    console.error('Get attendance status error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
