import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';
import { clockInDataSchema } from '@/lib/attendance-validation';
import { auth } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Get current user from auth (simplified - in production, verify JWT token)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validatedData = clockInDataSchema.parse({
      ...body,
      timestamp: new Date(body.timestamp || Date.now()),
    });

    // Clock in the employee
    const record = await attendanceService.clockIn({
      ...validatedData,
      employeeId: body.employeeId,
      employeeName: body.employeeName,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Clock in error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to clock in',
      },
      { status: 500 }
    );
  }
}
