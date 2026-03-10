import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { passwordManagerService } from '@/services/password-manager.service';

const recordSchema = z.object({
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

const bulkImportSchema = z.object({
  records: z.array(recordSchema).min(1, 'At least one record is required'),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const body = await request.json();
    const validation = bulkImportSchema.safeParse(body);
    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Verify user has access to all categories in the import
    const categories = [...new Set(validation.data.records.map((r) => r.category))];
    for (const category of categories) {
      const hasAccess = await passwordManagerService.hasUserCategoryAccess(
        authResult.user.uid,
        category
      );
      if (!hasAccess) {
        return ErrorResponses.forbidden(`You do not have access to the "${category}" category`);
      }
    }

    const result = await passwordManagerService.bulkCreate(
      validation.data.records,
      authResult.user.uid
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
