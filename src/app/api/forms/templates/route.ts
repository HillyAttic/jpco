import { NextResponse } from 'next/server';
import { withAuth, withManagerAuth } from '@/lib/server-auth';
import { formTemplateService } from '@/services/form-template.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import type { FormTemplateFilters } from '@/types/form.types';

/**
 * GET /api/forms/templates
 * List all form templates with optional filters
 * Auth: Any authenticated user (access control checked per template)
 */
export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);

    const filters: FormTemplateFilters = {
      status: searchParams.get('status') as any,
      createdBy: searchParams.get('createdBy') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
    };

    console.log('[Forms API] Fetching templates with filters:', filters);
    const templates = await formTemplateService.getAll(filters);
    console.log('[Forms API] Found templates:', templates.length);

    // Filter templates based on user access
    const user = request.user!;
    const accessibleTemplates = templates.filter((template) =>
      formTemplateService.canUserAccess(template, {
        uid: user.uid,
        role: user.claims.role,
      })
    );

    console.log('[Forms API] Accessible templates:', accessibleTemplates.length);

    return NextResponse.json({
      success: true,
      templates: accessibleTemplates,
      total: accessibleTemplates.length,
    });
  } catch (error) {
    console.error('[Forms API] Error in GET /api/forms/templates:', error);
    return handleApiError(error);
  }
});

/**
 * POST /api/forms/templates
 * Create a new form template
 * Auth: Manager or Admin
 */
export const POST = withManagerAuth(async (request) => {
  try {
    console.log('[Forms API] POST /api/forms/templates - Starting');
    const body = await request.json();
    console.log('[Forms API] Request body:', JSON.stringify(body, null, 2));

    const { uid } = request.user!;
    console.log('[Forms API] User UID:', uid);

    // Validate required fields
    if (!body.title || !body.fields || !Array.isArray(body.fields)) {
      console.log('[Forms API] Validation failed - missing title or fields');
      return NextResponse.json(
        { error: 'Title and fields are required' },
        { status: 400 }
      );
    }

    // Set defaults (omit undefined values for Firestore)
    const templateData: any = {
      title: body.title,
      description: body.description || '',
      status: body.status || 'draft',
      fields: body.fields,
      settings: body.settings || {
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!',
        allowMultipleSubmissions: false,
      },
      accessControl: body.accessControl || {
        type: 'authenticated',
      },
    };

    // Only add category if it's provided
    if (body.category) {
      templateData.category = body.category;
    }

    console.log('[Forms API] Creating template with data:', JSON.stringify(templateData, null, 2));
    const template = await formTemplateService.create(templateData, uid);
    console.log('[Forms API] Template created successfully:', template.id);

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('[Forms API] Error in POST /api/forms/templates:', error);
    return handleApiError(error);
  }
});
