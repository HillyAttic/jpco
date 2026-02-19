import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { clockInDataSchema } from '@/lib/attendance-validation';
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

    const validatedData = clockInDataSchema.parse({
      employeeId: body.employeeId || authResult.user.uid,
      timestamp: new Date(body.timestamp || Date.now()),
      location: body.location,
      notes: body.notes,
    });

    const record = await attendanceAdminService.clockIn({
      ...validatedData,
      employeeName: body.employeeName || authResult.user.email || '',
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Already clocked in', message: 'Employee has already clocked in today' },
        { status: 409 }
      );
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Clock in error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to clock in' },
      { status: 500 }
    );
  }
}
