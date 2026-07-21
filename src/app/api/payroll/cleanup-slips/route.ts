import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * POST /api/payroll/cleanup-slips
 * Admin only - delete all salary slips for a specific month/year
 * This is a bulk cleanup operation for admin convenience
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Only admins can perform cleanup operations
    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can clean up salary slips');
    }

    const cleanupSchema = z.object({
      month: z.number().min(0).max(11, 'Month must be 0-11'),
      year: z.number().min(2020).max(2099, 'Year must be valid'),
    });

    const body = await request.json();
    const validatedData = cleanupSchema.parse(body);

    console.log(`[API /api/payroll/cleanup-slips] POST - Admin: ${authResult.user.uid}, Month: ${validatedData.month}, Year: ${validatedData.year}`);

    // Get all slips for the specified period
    const slipsToDelete = await payrollAdminService.getSlips({
      month: validatedData.month,
      year: validatedData.year,
    });

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
