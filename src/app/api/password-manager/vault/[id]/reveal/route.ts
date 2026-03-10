import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { passwordManagerService } from '@/services/password-manager.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) return ErrorResponses.unauthorized();

    const { id } = await params;
    try {
      const password = await passwordManagerService.revealPassword(id, authResult.user.uid);
      return NextResponse.json({ password });
    } catch (err) {
      if (err instanceof Error && err.message === 'Access denied') {
        return ErrorResponses.forbidden('You do not have access to this record');
      }
      if (err instanceof Error && err.message === 'Record not found') {
        return ErrorResponses.notFound('Credential record');
      }
      throw err;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
