import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/server-auth';
import { formSubmissionService } from '@/services/form-submission.service';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * GET /api/forms/submissions/[id]
 * Get a single submission by ID
 * Auth: Submitter, form creator, or admin/manager
 */
export const GET = withAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const { uid, claims } = request.user!;

      const submission = await formSubmissionService.getById(id);
      if (!submission) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      // Check access: submitter, admin, or manager
      const isSubmitter = submission.submittedBy === uid;
      const isAdminOrManager =
        claims.role === 'admin' || claims.role === 'manager';

      if (!isSubmitter && !isAdminOrManager) {
        return NextResponse.json(
          { error: 'Access denied to this submission' },
          { status: 403 }
        );
      }

      // Mark as read if admin/manager is viewing
      if (isAdminOrManager && !submission.isRead) {
        await formSubmissionService.markAsRead(id);
      }

      return NextResponse.json({
        success: true,
        submission,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);

/**
 * PUT /api/forms/submissions/[id]
 * Update a submission (admin/manager only)
 * Auth: Admin or Manager
 */
export const PUT = withAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const { claims } = request.user!;

      // Only admin/manager can update submissions
      if (claims.role !== 'admin' && claims.role !== 'manager') {
        return NextResponse.json(
          { error: 'Only admins and managers can update submissions' },
          { status: 403 }
        );
      }

      const body = await request.json();

      const updated = await formSubmissionService.update(id, body);
      if (!updated) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        submission: updated,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);

/**
 * DELETE /api/forms/submissions/[id]
 * Delete a submission
 * Auth: Admin only
 */
export const DELETE = withAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const { claims } = request.user!;

      // Only admin can delete submissions
      if (claims.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can delete submissions' },
          { status: 403 }
        );
      }

      await formSubmissionService.delete(id);

      return NextResponse.json({
        success: true,
        message: 'Submission deleted successfully',
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
