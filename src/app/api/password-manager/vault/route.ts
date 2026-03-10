import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { passwordManagerService } from '@/services/password-manager.service';

const createSchema = z.object({
  category: z.enum(['gst', 'income-tax', 'mca']),
  plainPassword: z.string().min(1, 'Password is required'),
  clientName: z.string().min(1, 'Client name is required'),
  username: z.string().min(1, 'Username is required'),
  serialNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  panNumber: z.string().optional(),
  membershipDin: z.string().optional(),
});

/** GET /api/password-manager/vault — returns records accessible to the current user */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const category = request.nextUrl.searchParams.get('category') as any;
    const data = await passwordManagerService.getAccessibleByUser(
      authResult.user.uid,
      category || undefined
    );
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/password-manager/vault — create a record (user must have category access) */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const hasAccess = await passwordManagerService.hasUserCategoryAccess(
      authResult.user.uid,
      validation.data.category
    );
    if (!hasAccess) return ErrorResponses.forbidden('You do not have access to this category');

    const record = await passwordManagerService.create(validation.data, authResult.user.uid);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
