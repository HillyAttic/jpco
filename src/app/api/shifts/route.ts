import { NextRequest, NextResponse } from 'next/server';
import { shiftService } from '@/services/shift.service';
import { shiftSchema } from '@/lib/attendance-validation';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const shifts = await shiftService.getShifts();
    return NextResponse.json(shifts, { status: 200 });
  } catch (error: any) {
    console.error('Get shifts error:', error);
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
    const validatedData = shiftSchema.parse(body);

    const shift = await shiftService.createShift(validatedData);

    return NextResponse.json(shift, { status: 201 });
  } catch (error: any) {
    console.error('Create shift error:', error);

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
