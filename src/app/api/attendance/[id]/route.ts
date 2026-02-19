import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete attendance records');
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Attendance record ID is required' },
        { status: 400 }
      );
    }

    console.log('Deleting attendance record with ID:', id);
    await attendanceAdminService.deleteAttendanceRecord(id);

    return NextResponse.json(
      { message: 'Attendance record deleted successfully' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Delete attendance error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}