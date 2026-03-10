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
  allowedUserIds: z.array(z.string()).optional(),
  serialNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  panNumber: z.string().optional(),
  membershipDin: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') return ErrorResponses.forbidden();

    const category = request.nextUrl.searchParams.get('category') as any;
    const data = await passwordManagerService.getAll(category ? { category } : undefined);
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();
    if (authResult.user.claims.role !== 'admin') return ErrorResponses.forbidden();

    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const record = await passwordManagerService.create(validation.data, authResult.user.uid);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
