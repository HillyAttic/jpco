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
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const body = await request.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Record ID is required' },
        { status: 400 }
      );
    }

    const record = await attendanceAdminService.endBreak(recordId);

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('End break error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to end break' },
      { status: 500 }
    );
  }
}
