import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

/**
 * POST /api/payroll/slips/[id]/pan
 * Allows an authenticated employee to update PAN on their own salary slip.
 * Also updates the employee's user profile so future slips auto-populate.
 */
export const POST = withAuth(async (
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    // Get the salary slip
    const slipDoc = await adminDb.collection('salary-slips').doc(id).get();
    if (!slipDoc.exists) {
      return ErrorResponses.notFound('Salary slip not found');
    }

    const slipData = slipDoc.data()!;

    // Verify the employee owns this slip
    if (slipData.employeeId !== userId) {
      return ErrorResponses.forbidden('You can only update your own salary slip');
    }

    // Validate request body
    const body = await request.json();
    const schema = z.object({
      pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, 'Invalid PAN format. Expected format: ABCDE1234F'),
    });

    const validationResult = schema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const formattedPan = validationResult.data.pan.toUpperCase();

    // Update PAN on the salary slip
    await adminDb.collection('salary-slips').doc(id).update({
      pan: formattedPan,
    });

    // Also update PAN on the employee's user profile for future slips
    await adminDb.collection('users').doc(userId).update({
      pan: formattedPan,
    });

    return NextResponse.json({ success: true, pan: formattedPan });
  } catch (error) {
    return handleApiError(error);
  }
});
