import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const toggleSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH /api/categories/[id]/toggle
 * Toggle category active status using Admin SDK
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can toggle categories');
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = toggleSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { isActive } = validationResult.data;

    const docRef = adminDb.collection('categories').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return ErrorResponses.notFound('Category');
    }

    await docRef.update({ isActive, updatedAt: Timestamp.now() });
    const updated = await docRef.get();

    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    return handleApiError(error);
  }
}
