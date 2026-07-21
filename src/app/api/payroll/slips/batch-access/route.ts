import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

/**
 * PATCH /api/payroll/slips/batch-access
 * Admin only — batch update accessGranted on multiple salary slips
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update slip access');
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
