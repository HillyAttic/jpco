import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * GET /api/payroll/templates/[id]
 * Admin only - returns a single template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can access salary slip templates');
    }

    const { id } = await params;
    const template = await payrollAdminService.getTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/payroll/templates/[id]
 * Admin only - update a template (partial updates supported)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update salary slip templates');
    }

    const { id } = await params;

    const fieldSchema = z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      visible: z.boolean(),
    });

    const sectionSchema = z.object({
      key: z.string().min(1),
      title: z.string().min(1),
      visible: z.boolean(),
      fields: z.array(fieldSchema),
    });

    const updateSchema = z.object({
      title: z.string().min(1).optional(),
      sections: z.array(sectionSchema).min(1).optional(),
      showFooterNote: z.boolean().optional(),
      showSlipNumber: z.boolean().optional(),
      footerNote: z.string().optional(),
    });

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const success = await payrollAdminService.updateTemplate(id, validated);
    if (!success) {
      return NextResponse.json({ error: 'Template not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/payroll/templates/[id]
 * Admin only - delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can delete salary slip templates');
    }

    const { id } = await params;
    await payrollAdminService.deleteTemplate(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
