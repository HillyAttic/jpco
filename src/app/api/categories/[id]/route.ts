import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Validation schema for category update
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color)').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/categories/[id]
 * Get a single category by ID using Admin SDK
 */
export async function GET(
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
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { id } = await params;
    const doc = await adminDb.collection('categories').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Category');
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/categories/[id]
 * Update a category using Admin SDK
 */
export async function PUT(
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
      return ErrorResponses.forbidden('Only managers and admins can update categories');
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const docRef = adminDb.collection('categories').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return ErrorResponses.notFound('Category');
    }

    await docRef.update({ ...validationResult.data, updatedAt: Timestamp.now() });
    const updated = await docRef.get();

    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/categories/[id]
 * Delete a category using Admin SDK
 */
export async function DELETE(
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
      return ErrorResponses.forbidden('Only managers and admins can delete categories');
    }

    const { id } = await params;

    const docRef = adminDb.collection('categories').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return ErrorResponses.notFound('Category');
    }

    await docRef.delete();

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
