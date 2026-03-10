import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { passwordManagerService } from '@/services/password-manager.service';

const updateSchema = z.object({
  userId: z.string().min(1),
  categories: z.array(z.enum(['gst', 'income-tax', 'mca'])),
});

/** GET /api/password-manager/access — admin: list all users with their granted categories */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') return ErrorResponses.forbidden();

    const users = await passwordManagerService.getAllUsersAccess();
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/password-manager/access — admin: update a user's granted categories */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') return ErrorResponses.forbidden();

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    await passwordManagerService.updateUserCategoryAccess(
      validation.data.userId,
      validation.data.categories,
      authResult.user.uid
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
