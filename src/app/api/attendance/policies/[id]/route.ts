import { NextRequest, NextResponse } from 'next/server';
import { attendancePolicyAdminService } from '@/services/attendance-policy-admin.service';
import { attendancePolicySchema } from '@/lib/attendance-validation';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const policy = await attendancePolicyAdminService.getPolicy(id);
    if (!policy) {
      return ErrorResponses.notFound('Attendance policy not found');
    }

    return NextResponse.json(policy, { status: 200 });
  } catch (error: any) {
    console.error('Get attendance policy error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update attendance policies');
    }

    const body = await request.json();
    const validatedData = attendancePolicySchema.partial().parse(body);

    const policy = await attendancePolicyAdminService.updatePolicy(id, validatedData);

    return NextResponse.json(policy, { status: 200 });
  } catch (error: any) {
    console.error('Update attendance policy error:', error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can delete attendance policies');
    }

    await attendancePolicyAdminService.deletePolicy(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Delete attendance policy error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
