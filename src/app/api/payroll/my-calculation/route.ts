import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * POST /api/payroll/my-calculation
 * Employee - fetch their own salary calculation for a given month/year.
 * Used by the self-service salary slip page to show live attendance data
 * instead of stale snapshotted values.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const schema = z.object({
      month: z.number().min(0).max(11),
      year: z.number().min(2020).max(2099),
    });

    const body = await request.json();
    const validated = schema.parse(body);

    // Employees can only calculate for themselves
    const result = await payrollAdminService.calculateSalary(
      authResult.user.uid,
      validated.month,
      validated.year
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
