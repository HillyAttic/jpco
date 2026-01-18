import { NextRequest, NextResponse } from 'next/server';
import { shiftService } from '@/services/shift.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    await shiftService.assignShiftToEmployee(id, employeeId);

    return NextResponse.json(
      { message: 'Shift assigned successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Assign shift error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
