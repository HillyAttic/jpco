import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * POST /api/payroll/calculate
 * Admin only - preview salary calculation for one employee
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can calculate salary');
    }

    const calculateSchema = z.object({
      employeeId: z.string().min(1, 'Employee ID is required'),
      month: z.number().min(0).max(11, 'Month must be 0-11'),
      year: z.number().min(2020).max(2099, 'Year must be valid'),
    });

    const body = await request.json();
    const validatedData = calculateSchema.parse(body);

    const result = await payrollAdminService.calculateSalary(
      validatedData.employeeId,
      validatedData.month,
      validatedData.year
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
