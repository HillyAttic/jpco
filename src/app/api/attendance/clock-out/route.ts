import { NextRequest, NextResponse } from 'next/server';
import { attendanceAdminService } from '@/services/attendance-admin.service';
import { clockOutDataSchema } from '@/lib/attendance-validation';
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

    const validatedData = clockOutDataSchema.parse({
      ...body,
      timestamp: new Date(body.timestamp || Date.now()),
    });

    const record = await attendanceAdminService.clockOut(validatedData.recordId, {
      timestamp: validatedData.timestamp,
      location: validatedData.location,
      notes: validatedData.notes,
    });

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Clock out error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Failed to clock out' },
      { status: 500 }
    );
  }
}
