import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';
import { clockOutDataSchema } from '@/lib/attendance-validation';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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
    const validatedData = clockOutDataSchema.parse({
      ...body,
      timestamp: new Date(body.timestamp || Date.now()),
    });

    // Clock out the employee
    const record = await attendanceService.clockOut(
      validatedData.recordId,
      {
        timestamp: validatedData.timestamp,
        location: validatedData.location,
        notes: validatedData.notes,
      }
    );

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Clock out error:', error);

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
        message: error.message || 'Failed to clock out',
      },
      { status: 500 }
    );
  }
}
