import { NextRequest, NextResponse } from 'next/server';
import { shiftAdminService } from '@/services/shift-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function POST(
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
      return ErrorResponses.forbidden('Only managers and admins can assign shifts');
    }

    const { id } = await params;
    const body = await request.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Employee ID is required' },
        { status: 400 }
      );
    }

    await shiftAdminService.assignShiftToEmployee(id, employeeId);

    return NextResponse.json({ message: 'Shift assigned successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Assign shift error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
