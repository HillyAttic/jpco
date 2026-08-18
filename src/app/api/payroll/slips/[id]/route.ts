import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { payrollAdminService } from '@/services/payroll-admin.service';
import { z } from 'zod';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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

    // Managers can only view slips for their assigned employees —
    // but always allow a manager to view their OWN slip (self-service)
    if (
      authResult.user.claims.role === 'manager' &&
      slip.employeeId !== authResult.user.uid
    ) {
      const { hasAccessToEmployee } = await import('@/lib/manager-access');
      if (!(await hasAccessToEmployee(authResult.user.uid, authResult.user.claims.role, slip.employeeId))) {
        return ErrorResponses.forbidden('You can only view slips for your assigned employees');
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

    if (!['admin', 'manager'].includes(authResult.user.claims.role)) {
      return ErrorResponses.forbidden('Only admins and managers can delete salary slips');
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

    if (!['admin', 'manager'].includes(authResult.user.claims.role)) {
      return ErrorResponses.forbidden('Only admins and managers can update salary slips');
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
        leaveDeduction: z.number().optional(),
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

    if (!['admin', 'manager'].includes(authResult.user.claims.role)) {
      return ErrorResponses.forbidden('Only admins and managers can update slip access');
    }

    const { id } = await params;
    const patchSchema = z.object({
      accessGranted: z.boolean(),
    });

    const body = await request.json();
    const validatedData = patchSchema.parse(body);

    // Check previous access state before updating
    const slipDoc = await adminDb.collection('salary-slips').doc(id).get();
    if (!slipDoc.exists) {
      return NextResponse.json({ error: 'Salary slip not found' }, { status: 404 });
    }
    const slipData = slipDoc.data()!;
    const previousAccessGranted = slipData.accessGranted as boolean;
    const employeeId = slipData.employeeId as string;
    const month = slipData.month as number;
    const year = slipData.year as number;

    await adminDb.collection('salary-slips').doc(id).update({
      accessGranted: validatedData.accessGranted,
    });

    let notificationSent = false;

    // Send notification when toggling access from false to true
    if (validatedData.accessGranted && !previousAccessGranted) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const periodLabel = `${monthNames[month]} ${year}`;

      // Look up employee's FCM token
      const userDoc = await adminDb.collection('users').doc(employeeId).get();
      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      // Send FCM push notification if token exists
      if (fcmToken) {
        try {
          await adminMessaging.send({
            token: fcmToken,
            notification: {
              title: 'Salary Slip Available',
              body: `Your salary slip for ${periodLabel} has been made available. Check your dashboard to view and download it.`,
            },
            data: {
              type: 'salary-slip',
              slipId: id,
              month: String(month),
              year: String(year),
              url: '/salary-slip',
            },
          });
          notificationSent = true;
          console.log(`[API /api/payroll/slips/${id}] PATCH - FCM notification sent to employee ${employeeId}`);
        } catch (fcmError) {
          console.error(`[API /api/payroll/slips/${id}] PATCH - FCM notification failed:`, fcmError);
        }
      }

      // Always create in-app notification
      await adminDb.collection('notifications').add({
        userId: employeeId,
        type: 'salary-slip-access',
        title: 'Salary Slip Available',
        message: `Your salary slip for ${periodLabel} has been made available. Visit the Salary Slip page to view and download it.`,
        read: false,
        createdAt: Timestamp.now(),
        metadata: { slipId: id, month, year },
        actionUrl: '/salary-slip',
        data: {
          url: '/salary-slip',
          type: 'salary-slip-access',
          slipId: id,
          month,
          year,
        },
      });
      notificationSent = true;
      console.log(`[API /api/payroll/slips/${id}] PATCH - In-app notification created for employee ${employeeId}`);
    }

    return NextResponse.json({ success: true, notificationSent }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
