import { NextRequest, NextResponse } from 'next/server';
import { leaveService } from '@/services/leave.service';
import { leaveRequestSchema } from '@/lib/attendance-validation';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      employeeId: searchParams.get('employeeId') || undefined,
      status: searchParams.get('status') as any,
      leaveTypeId: searchParams.get('leaveTypeId') || undefined,
    };

    const requests = await leaveService.getLeaveRequests(filters);
    return NextResponse.json(requests, { status: 200 });
  } catch (error: any) {
    console.error('Get leave requests error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validatedData = leaveRequestSchema.parse({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });

    const leaveRequest = await leaveService.createLeaveRequest({
      ...validatedData,
      employeeId: body.employeeId,
      employeeName: body.employeeName,
    });

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error: any) {
    console.error('Create leave request error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
