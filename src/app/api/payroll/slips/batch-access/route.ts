import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

/**
 * PATCH /api/payroll/slips/batch-access
 * Admin/Manager — batch update accessGranted on multiple salary slips
 * For managers: only updates slips for their assigned employees
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can update slip access');
    }

    const batchSchema = z.object({
      updates: z
        .array(
          z.object({
            slipId: z.string(),
            accessGranted: z.boolean(),
          })
        )
        .min(1, 'At least one update is required')
        .max(500, 'Maximum 500 updates per batch'),
    });

    const body = await request.json();
    const validatedData = batchSchema.parse(body);

    // For managers: verify all slips belong to their assigned employees
    if (userRole === 'manager') {
      const { getAccessibleEmployeeIds } = await import('@/lib/manager-access');
      const accessibleIds = await getAccessibleEmployeeIds(authResult.user.uid, userRole);

      // Fetch all slips to verify ownership
      const slipIds = validatedData.updates.map(u => u.slipId);
      const slipDocs = await Promise.all(
        slipIds.map(id => adminDb.collection('salary-slips').doc(id).get())
      );

      for (const doc of slipDocs) {
        if (!doc.exists) continue;
        const slipData = doc.data();
        if (!accessibleIds.includes(slipData!.employeeId as string)) {
          return ErrorResponses.forbidden('You can only update slips for your assigned employees');
        }
      }
    }

    // Firestore batch — atomic, single round-trip
    const batch = adminDb.batch();
    for (const update of validatedData.updates) {
      const slipRef = adminDb.collection('salary-slips').doc(update.slipId);
      batch.update(slipRef, { accessGranted: update.accessGranted });
    }

    await batch.commit();

    return NextResponse.json(
      { success: true, updatedCount: validatedData.updates.length },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
