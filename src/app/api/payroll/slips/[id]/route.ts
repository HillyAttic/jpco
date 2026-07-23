import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/payroll/slips/[id]
 * Get a single salary slip
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

    const { id } = await params;
    const slip = await payrollAdminService.getSlipById(id);

    if (!slip) {
      return ErrorResponses.notFound('Salary slip not found');
    }

    // CRITICAL: Employees can only view their own slips AND only if access is granted
    if (authResult.user.claims.role === 'employee') {
      if (slip.employeeId !== authResult.user.uid) {
        return ErrorResponses.forbidden('You can only view your own salary slips');
      }
      if (!slip.accessGranted) {
        return ErrorResponses.forbidden('Access to this salary slip has not been granted');
      }
    }

    return NextResponse.json(slip, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/payroll/slips/[id]
 * Admin only - delete a salary slip
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
      return ErrorResponses.forbidden('Only admins can delete salary slips');
    }

    const { id } = await params;
    await payrollAdminService.deleteSlips([id]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/payroll/slips/[id]
 * Admin only - update salary slip data (salary, deductions, attendance, etc.)
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
      return ErrorResponses.forbidden('Only admins can update salary slips');
    }

    const { id } = await params;

    // Verify the slip exists
    const slip = await payrollAdminService.getSlipById(id);
    if (!slip) {
      return ErrorResponses.notFound('Salary slip not found');
    }

    const updateSchema = z.object({
      grossSalary: z.number().optional(),
      paidDays: z.number().optional(),
      designation: z.string().optional(),
      department: z.string().optional(),
      pan: z.string().nullable().optional(),
      doj: z.string().nullable().optional(),
      salaryBreakup: z.object({
        basic: z.number(),
        hra: z.number(),
        special: z.number(),
        totalDeductions: z.number(),
        netSalary: z.number(),
        epf: z.number().optional(),
        esi: z.number().optional(),
        professionalTax: z.number().optional(),
        tds: z.number().optional(),
        loanRecovery: z.number().optional(),
        otherDeduction: z.number().optional(),
      }).optional(),
      attendanceBreakdown: z.object({
        present: z.number(),
        wfh: z.number(),
        approvedLeave: z.number(),
        unapprovedLeave: z.number(),
        halfDay: z.number(),
        holiday: z.number(),
        paidLeave: z.number(),
        leaveTaken: z.number(),
        unpaidLeave: z.number(),
        paidDays: z.number(),
      }).optional(),
    });

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    await payrollAdminService.updateSlip(id, validatedData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/payroll/slips/[id]
 * Admin only - toggle accessGranted on a salary slip
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    if (authResult.user.claims.role !== 'admin') {
      return ErrorResponses.forbidden('Only admins can update slip access');
    }

    const { id } = await params;
    const patchSchema = z.object({
      accessGranted: z.boolean(),
    });

    const body = await request.json();
    const validatedData = patchSchema.parse(body);

    await adminDb.collection('salary-slips').doc(id).update({
      accessGranted: validatedData.accessGranted,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
