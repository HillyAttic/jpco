import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * GET /api/payroll/templates
 * Admin only - returns all salary slip templates
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can access salary slip templates');
    }

    const templates = await payrollAdminService.getTemplates();
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/payroll/templates
 * Admin only - create a new salary slip template
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can create salary slip templates');
    }

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

    const templateSchema = z.object({
      title: z.string().min(1, 'Template name is required'),
      sections: z.array(sectionSchema).min(1, 'At least one section is required'),
      showFooterNote: z.boolean(),
      showSlipNumber: z.boolean(),
      footerNote: z.string().optional(),
    });

    const body = await request.json();
    const validated = templateSchema.parse(body);

    const created = await payrollAdminService.createTemplate(validated);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
