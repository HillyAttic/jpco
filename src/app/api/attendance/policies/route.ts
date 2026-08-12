import { NextRequest, NextResponse } from 'next/server';
import { attendancePolicyAdminService } from '@/services/attendance-policy-admin.service';
import { attendancePolicySchema } from '@/lib/attendance-validation';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const policies = await attendancePolicyAdminService.getPolicies();
    return NextResponse.json(policies, { status: 200 });
  } catch (error: any) {
    console.error('Get attendance policies error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can create attendance policies');
    }

    const body = await request.json();
    const validatedData = attendancePolicySchema.parse(body);

    const policy = await attendancePolicyAdminService.createPolicy(validatedData);

    return NextResponse.json(policy, { status: 201 });
  } catch (error: any) {
    console.error('Create attendance policy error:', error);

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
