import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { formSubmissionService } from '@/services/form-submission.service';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/forms/submissions/check-today
 * Check if a user has submitted a form today
 * This replaces the Google Sheets check for daily MIS form validation
 * Auth: Authenticated user
 */
export const POST = withAuth(async (request) => {
  try {
    const body = await request.json();
    const { uid } = request.user!;

    // Validate required fields
    if (!body.formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Use provided userId or default to authenticated user
    const userId = body.userId || uid;

    // Check if user submitted today
    const result = await formSubmissionService.checkUserSubmissionToday(
      body.formId,
      userId,
      body.date ? new Date(body.date) : new Date()
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
