import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/services/attendance.service';

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
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Start break
    const record = await attendanceService.startBreak(recordId);

    return NextResponse.json(record, { status: 200 });
  } catch (error: any) {
    console.error('Start break error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to start break',
      },
      { status: 500 }
    );
  }
}
