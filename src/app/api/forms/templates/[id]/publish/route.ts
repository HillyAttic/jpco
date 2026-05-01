import { NextResponse } from 'next/server';
import { withManagerAuth } from '@/lib/server-auth';
import { formTemplateService } from '@/services/form-template.service';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/forms/templates/[id]/publish
 * Publish a form template (change status to 'published')
 * Auth: Manager/Admin or template creator
 */
export const POST = withManagerAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const { uid, claims } = request.user!;

      // Get existing template
      const existing = await formTemplateService.getById(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'Form template not found' },
          { status: 404 }
        );
      }

      // Check if user is creator or admin
      if (existing.createdBy !== uid && claims.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only the creator or admin can publish this form' },
          { status: 403 }
        );
      }

      // Validate that form has at least one field
      if (!existing.fields || existing.fields.length === 0) {
        return NextResponse.json(
          { error: 'Cannot publish a form with no fields' },
          { status: 400 }
        );
      }

      // Publish the template
      const published = await formTemplateService.publish(id);

      return NextResponse.json({
        success: true,
        template: published,
        message: 'Form template published successfully',
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
