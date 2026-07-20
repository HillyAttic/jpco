import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';

/**
 * GET /api/payroll/settings
 * Any authenticated user can read payroll settings (needed for PDF download on employee side)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Any authenticated user can read settings (employees need it for PDF download)
    const settings = await payrollAdminService.getSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/payroll/settings
 * Admin only - partial update (used for access config toggle persistence)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update payroll settings');
    }

    const body = await request.json();

    // Only allow updating accessConfig via PATCH
    if (body.accessConfig !== undefined) {
      const existing = await payrollAdminService.getSettings();
      if (existing?.id) {
        const { adminDb } = await import('@/lib/firebase-admin');
        const { Timestamp } = await import('firebase-admin/firestore');
        await adminDb.collection('payroll-settings').doc(existing.id).update({
          accessConfig: body.accessConfig,
          updatedAt: Timestamp.now(),
        });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/payroll/settings
 * Admin only - update payroll settings
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update payroll settings');
    }

    const settingsSchema = z.object({
      companyName: z.string().min(1, 'Company name is required'),
      companyAddress: z.string().min(1, 'Company address is required'),
      logoUrl: z.string().nullable(),
      basicPercentage: z.number().min(0).max(100),
      hraPercentage: z.number().min(0).max(100),
      specialPercentage: z.number().min(0).max(100),
      allowedPaidLeaves: z.number().min(0).int(),
      includePaidLeavesInPaidDays: z.boolean().default(false),
      footerNote: z.string(),
      salaryFormula: z.string().optional(),
    });

    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // Validate percentages sum to 100
    const totalPercentage = validatedData.basicPercentage + validatedData.hraPercentage + validatedData.specialPercentage;
    if (totalPercentage !== 100) {
      return NextResponse.json(
        { error: 'Percentages must sum to 100' },
        { status: 400 }
      );
    }

    await payrollAdminService.saveSettings(validatedData);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
