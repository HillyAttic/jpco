import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * POST /api/payroll/cleanup-slips
 * Admin/Manager - delete salary slips for a specific month/year
 * For managers: only deletes slips for their assigned employees
 * For admins: deletes all slips for the period
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can clean up salary slips');
    }

    const cleanupSchema = z.object({
      month: z.number().min(0).max(11, 'Month must be 0-11'),
      year: z.number().min(2020).max(2099, 'Year must be valid'),
    });

    const body = await request.json();
    const validatedData = cleanupSchema.parse(body);

    console.log(`[API /api/payroll/cleanup-slips] POST - User: ${authResult.user.uid} (${userRole}), Month: ${validatedData.month}, Year: ${validatedData.year}`);

    // Get all slips for the specified period
    let slipsToDelete = await payrollAdminService.getSlips({
      month: validatedData.month,
      year: validatedData.year,
    });

    // For managers: filter to only their assigned employees
    if (userRole === 'manager') {
      const { getAccessibleEmployeeIds } = await import('@/lib/manager-access');
      const accessibleIds = await getAccessibleEmployeeIds(authResult.user.uid, userRole);
      slipsToDelete = slipsToDelete.filter(slip => accessibleIds.includes(slip.employeeId));
    }

    if (slipsToDelete.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          deletedCount: 0,
          message: 'No salary slips found for this period'
        }, 
        { status: 200 }
      );
    }

    // Extract slip IDs
    const slipIds = slipsToDelete.map(slip => slip.id).filter(id => id) as string[];

    console.log(`[API /api/payroll/cleanup-slips] Deleting ${slipIds.length} slip(s)`);

    // Delete all slips
    await payrollAdminService.deleteSlips(slipIds);

    console.log(`[API /api/payroll/cleanup-slips] Successfully deleted ${slipIds.length} slip(s)`);

    return NextResponse.json(
      { 
        success: true, 
        deletedCount: slipIds.length,
        message: `Successfully deleted ${slipIds.length} salary slip(s)`
      }, 
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
