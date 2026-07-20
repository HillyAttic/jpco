import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

/**
 * GET /api/payroll/slips
 * Authenticated users - list salary slips
 * Employees can only see their own slips
 * Admins/Managers can see all slips
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build filters
    const filters: { employeeId?: string; month?: number; year?: number; accessGranted?: boolean } = {};

    // Employees can only see their own slips with access granted
    if (authResult.user.claims.role === 'employee') {
      filters.employeeId = authResult.user.uid;
    } else if (employeeId) {
      // Admins/Managers can filter by employee
      filters.employeeId = employeeId;
    }

    // Filter by access granted for all users
    filters.accessGranted = true;

    if (month) filters.month = parseInt(month, 10);
    if (year) filters.year = parseInt(year, 10);

    console.log(`[API /api/payroll/slips] GET - User: ${authResult.user.uid}, Role: ${authResult.user.claims.role}, Filters:`, JSON.stringify(filters));

    const slips = await payrollAdminService.getSlips(filters);
    console.log(`[API /api/payroll/slips] GET - Found ${slips.length} slip(s)`);
    return NextResponse.json(slips, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
