import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { passwordManagerService } from '@/services/password-manager.service';

const updateSchema = z.object({
  clientName: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  plainPassword: z.string().min(1).optional(),
  serialNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  panNumber: z.string().optional(),
  membershipDin: z.string().optional(),
});

/** PUT /api/password-manager/vault/[id] — update a record (user with category access) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;

    // Verify user has access to this record's category
    const record = await passwordManagerService.getById(id);
    if (!record) return ErrorResponses.notFound('Credential record');

    const hasAccess = await passwordManagerService.hasUserCategoryAccess(
      authResult.user.uid,
      record.category
    );
    if (!hasAccess) return ErrorResponses.forbidden('You do not have access to this category');

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updated = await passwordManagerService.update(id, validation.data);
    if (!updated) return ErrorResponses.notFound('Credential record');
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/password-manager/vault/[id] — delete a record (user with category access) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;

    const record = await passwordManagerService.getById(id);
    if (!record) return ErrorResponses.notFound('Credential record');

    const hasAccess = await passwordManagerService.hasUserCategoryAccess(
      authResult.user.uid,
      record.category
    );
    if (!hasAccess) return ErrorResponses.forbidden('You do not have access to this category');

    await passwordManagerService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
