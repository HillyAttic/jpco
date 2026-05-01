import { NextResponse } from 'next/server';
import { withAuth, withManagerAuth } from '@/lib/server-auth';
import { formTemplateService } from '@/services/form-template.service';
import { handleApiError } from '@/lib/api-error-handler';

/**
 * GET /api/forms/templates/[id]
 * Get a single form template by ID
 * Auth: Any authenticated user (access control checked)
 */
export const GET = withAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const template = await formTemplateService.getById(id);

      if (!template) {
        return NextResponse.json(
          { error: 'Form template not found' },
          { status: 404 }
        );
      }

      // Check if user has access
      const user = request.user!;
      const hasAccess = formTemplateService.canUserAccess(template, {
        uid: user.uid,
        role: user.claims.role,
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this form' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        template,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);

/**
 * PUT /api/forms/templates/[id]
 * Update a form template
 * Auth: Manager/Admin or template creator
 */
export const PUT = withManagerAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      const body = await request.json();
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
          { error: 'Only the creator or admin can edit this form' },
          { status: 403 }
        );
      }

      // Build update data (omit undefined values for Firestore)
      const updateData: any = {
        title: body.title,
        description: body.description || '',
        status: body.status,
        fields: body.fields,
        settings: body.settings,
        accessControl: body.accessControl,
      };

      // Only add category if it's provided
      if (body.category) {
        updateData.category = body.category;
      }

      // Update template
      const updated = await formTemplateService.update(id, updateData);

      return NextResponse.json({
        success: true,
        template: updated,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);

/**
 * DELETE /api/forms/templates/[id]
 * Delete a form template
 * Auth: Admin or template creator
 */
export const DELETE = withManagerAuth(
  async (request, context?: { params: Promise<{ id: string }> }) => {
    if (!context) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { params } = context;
    try {
      const { id } = await params;
      console.log('[Forms API] DELETE /api/forms/templates/:id - ID:', id);

      const { uid, claims } = request.user!;
      console.log('[Forms API] User:', { uid, role: claims.role });

      // Get existing template
      const existing = await formTemplateService.getById(id);
      console.log('[Forms API] Existing template:', existing ? 'found' : 'not found');

      if (!existing) {
        return NextResponse.json(
          { error: 'Form template not found' },
          { status: 404 }
        );
      }

      // Check if user is creator or admin
      if (existing.createdBy !== uid && claims.role !== 'admin') {
        console.log('[Forms API] Access denied - not creator or admin');
        return NextResponse.json(
          { error: 'Only the creator or admin can delete this form' },
          { status: 403 }
        );
      }

      console.log('[Forms API] Deleting template...');
      await formTemplateService.delete(id);
      console.log('[Forms API] Template deleted successfully');

      return NextResponse.json({
        success: true,
        message: 'Form template deleted successfully',
      });
    } catch (error) {
      console.error('[Forms API] Error in DELETE /api/forms/templates/:id:', error);
      return handleApiError(error);
    }
  }
);
