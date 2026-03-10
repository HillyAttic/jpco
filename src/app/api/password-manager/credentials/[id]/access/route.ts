import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { passwordManagerService } from '@/services/password-manager.service';

const accessUpdateSchema = z.object({
  allowedUserIds: z.array(z.string()),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') return ErrorResponses.forbidden();

    const { id } = await params;
    const record = await passwordManagerService.getById(id);
    if (!record) return ErrorResponses.notFound('Credential record');

    // Fetch user details for the allowed users
    const { adminDb } = await import('@/lib/firebase-admin');
    const usersSnapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'manager', 'employee'])
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || data.name || data.email || doc.id,
        email: data.email || '',
        hasAccess: record.allowedUserIds.includes(doc.id),
      };
    });

    return NextResponse.json({ allowedUserIds: record.allowedUserIds, users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') return ErrorResponses.forbidden();

    const { id } = await params;
    const body = await request.json();
    const validation = accessUpdateSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    await passwordManagerService.updateAccess(id, validation.data.allowedUserIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
