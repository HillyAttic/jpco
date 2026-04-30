import { NextResponse } from 'next/server';
import { withManagerAuth } from '@/lib/server-auth';
import { formTemplateService } from '@/services/form-template.service';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * POST /api/forms/templates/[id]/duplicate
 * Duplicate a form template
 * Auth: Manager or Admin
 */
export const POST = withManagerAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const { uid } = request.user!;

      // Get existing template
      const existing = await formTemplateService.getById(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'Form template not found' },
          { status: 404 }
        );
      }

      // Duplicate the template
      const duplicated = await formTemplateService.duplicate(id, uid);

      return NextResponse.json({
        success: true,
        template: duplicated,
        message: 'Form template duplicated successfully',
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
