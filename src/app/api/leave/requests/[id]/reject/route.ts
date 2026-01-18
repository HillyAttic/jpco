import { NextRequest, NextResponse } from 'next/server';
import { leaveService } from '@/services/leave.service';

export async function PATCH(
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
    const { approverId, reason } = body;

    if (!approverId || !reason) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Approver ID and reason are required' },
        { status: 400 }
      );
    }

    const leaveRequest = await leaveService.rejectLeaveRequest(
      id,
      approverId,
      reason
    );

    return NextResponse.json(leaveRequest, { status: 200 });
  } catch (error: any) {
    console.error('Reject leave request error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
