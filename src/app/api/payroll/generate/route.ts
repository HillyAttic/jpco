import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * POST /api/payroll/generate
 * Admin only - generate salary slips for selected employees
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can generate salary slips');
    }

    const generateSchema = z.object({
      employeeIds: z.array(z.string()).min(1, 'At least one employee is required'),
      month: z.number().min(0).max(11, 'Month must be 0-11'),
      year: z.number().min(2020).max(2099, 'Year must be valid'),
      accessMap: z.record(z.string(), z.boolean()).optional(),
    });

    const body = await request.json();
    const validatedData = generateSchema.parse(body);

    console.log(`[API /api/payroll/generate] POST - Admin: ${authResult.user.uid}, EmployeeIds:`, validatedData.employeeIds, `Month: ${validatedData.month}, Year: ${validatedData.year}, AccessMap:`, JSON.stringify(validatedData.accessMap));

    const slips = await payrollAdminService.generateSlips(
      validatedData.employeeIds,
      validatedData.month,
      validatedData.year,
      authResult.user.uid,
      validatedData.accessMap as Record<string, boolean> | undefined
    );

    console.log(`[API /api/payroll/generate] POST - Generated ${slips.length} slip(s)`);
    return NextResponse.json({ success: true, slips }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
