import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';

/**
 * GET /api/payroll/slips
 * Authenticated users - list salary slips
 * ALL users (including admin/manager) can only see their own slips when no employeeId is specified.
 * Admins/Managers can optionally pass employeeId to view a specific employee's slips.
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
    const includeAll = searchParams.get('includeAll') === 'true';

    // Build filters
    const filters: { employeeId?: string; month?: number; year?: number; accessGranted?: boolean } = {};
    const userRole = authResult.user.claims.role;

    // CRITICAL: Every user sees ONLY their own slips by default (self-service page)
    // Admins/Managers must explicitly pass an employeeId to view another employee's slips
    if (authResult.user.claims.role === 'employee') {
      // Employees: ALWAYS forced to their own uid, always require accessGranted
      filters.employeeId = authResult.user.uid;
      filters.accessGranted = true;
    } else if (employeeId) {
      // Admins/Managers explicitly requesting a specific employee.
      // Managers can only request their assigned employees — but always allow a
      // manager to view their OWN slips (self-service), even if not listed in
      // their own hierarchy.
      if (userRole === 'manager' && employeeId !== authResult.user.uid) {
        const { hasAccessToEmployee } = await import('@/lib/manager-access');
        if (!(await hasAccessToEmployee(authResult.user.uid, userRole, employeeId))) {
          return ErrorResponses.forbidden('You can only view slips for your assigned employees');
        }
      }
      filters.employeeId = employeeId;
      // Skip accessGranted filter when includeAll is set (admin/manager needs to find slips regardless of state)
      if (!includeAll) {
        filters.accessGranted = true;
      }
    } else if (includeAll && userRole === 'admin') {
      // Admins with includeAll=true — list all slips for the period (no uid/accessGranted filter)
      // Used by GenerateSlipsPanel handleToggleAll to batch-update existing slips
    } else if (includeAll && userRole === 'manager') {
      // Managers with includeAll=true — list only their assigned employees' slips
      const { getAccessibleEmployeeIds } = await import('@/lib/manager-access');
      const accessibleIds = await getAccessibleEmployeeIds(authResult.user.uid, userRole);
      // We can't use Firestore 'in' with more than 30 items, so we fetch all and filter
      // For small teams this is fine; for large orgs we'd need a different approach
      const allSlips = await payrollAdminService.getSlips({ month: filters.month, year: filters.year });
      const filtered = allSlips.filter(slip =>
        accessibleIds.includes(slip.employeeId) &&
        (!filters.accessGranted || slip.accessGranted === filters.accessGranted)
      );
      console.log(`[API /api/payroll/slips] GET - Manager ${authResult.user.uid}: returning ${filtered.length} slip(s) from ${allSlips.length} total`);
      return NextResponse.json(filtered, { status: 200 });
    } else {
      // Admins/Managers WITHOUT employeeId — force to their own uid (self-service)
      filters.employeeId = authResult.user.uid;
      filters.accessGranted = true;
    }

    if (month !== null && month !== '') filters.month = parseInt(month, 10);
    if (year !== null && year !== '') filters.year = parseInt(year, 10);

    console.log(`[API /api/payroll/slips] GET - User: ${authResult.user.uid}, Role: ${authResult.user.claims.role}, Filters:`, JSON.stringify(filters));

    const slips = await payrollAdminService.getSlips(filters);
    
    // CRITICAL SECURITY CHECK: Double-check that users only receive their authorized slips
    // Defense-in-depth: verifies the DB query correctly enforced the employeeId + accessGranted filter
    let filteredSlips = slips;
    if (filters.employeeId) {
      filteredSlips = slips.filter(slip =>
        slip.employeeId === filters.employeeId &&
        (filters.accessGranted ? slip.accessGranted === true : true)
      );

      if (slips.length !== filteredSlips.length) {
        console.error(
          `[API /api/payroll/slips] SECURITY VIOLATION - Filtered ${slips.length - filteredSlips.length} ` +
          `slip(s) that didn't match the enforced filter for user ${authResult.user.uid}`
        );
      }
    }
    
    console.log(`[API /api/payroll/slips] GET - Returning ${filteredSlips.length} slip(s)`);
    return NextResponse.json(filteredSlips, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
