import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const approveRejectSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  approvalReason: z.string().optional(),
});

/**
 * GET /api/delay-signin-requests/[id]
 * Get a single delay sign-in request
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection('delay-signin-requests').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Delay sign-in request');
    }

    const data = doc.data()!;
    const userRole = authResult.user.claims.role;

    if (userRole === 'employee' && data.employeeId !== authResult.user.uid) {
      return ErrorResponses.forbidden('You can only view your own delay sign-in requests');
    }

    const delayRequest = {
      id: doc.id,
      ...data,
      clockInTime: data.clockInTime?.toDate ? data.clockInTime.toDate().toISOString() : data.clockInTime,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
    };

    return NextResponse.json(delayRequest, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/delay-signin-requests/[id]
 * Approve or reject a delay sign-in request (admin/manager only)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can approve/reject delay sign-in requests');
    }

    const { id } = await params;
    const body = await request.json();
    const validation = approveRejectSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { action, reason, approvalReason } = validation.data;

    const { adminDb } = await import('@/lib/firebase-admin');
    const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const approverName = userData?.displayName || userData?.name || authResult.user.email || 'Unknown';

    const updates: Record<string, any> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy: authResult.user.uid,
      approverName,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (action === 'reject' && reason) {
      updates.rejectionReason = reason;
    }

    if (action === 'approve' && approvalReason) {
      updates.approvalReason = approvalReason;
    }

    await adminDb.collection('delay-signin-requests').doc(id).update(updates);

    const updatedDoc = await adminDb.collection('delay-signin-requests').doc(id).get();
    const data = updatedDoc.data()!;

    // Notify employee about decision
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const employeeId: string = data.employeeId;

      if (employeeId) {
        const isApproved = action === 'approve';
        const clockInStr = data.clockInTime?.toDate
          ? data.clockInTime.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : data.clockInTime;
        const notifTitle = isApproved ? 'Delay Sign-In Approved' : 'Delay Sign-In Rejected';
        const notifBody = isApproved
          ? `Your delay sign-in request (signed in at ${clockInStr}) has been approved.${approvalReason ? ` Note: ${approvalReason}` : ''}`
          : `Your delay sign-in request (signed in at ${clockInStr}) has been rejected.${reason ? ` Reason: ${reason}` : ''}`;

        await sendNotification({
          userIds: [employeeId],
          title: notifTitle,
          body: notifBody,
          data: { url: '/attendance', type: isApproved ? 'delay_signin_approved' : 'delay_signin_rejected' },
        });
      }
    } catch (notifError) {
      console.error('[delay-signin-requests/[id]] Error sending notification:', notifError);
    }

    const updated = {
      id: updatedDoc.id,
      ...data,
      clockInTime: data.clockInTime?.toDate ? data.clockInTime.toDate().toISOString() : data.clockInTime,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
    };

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/delay-signin-requests/[id]
 * Delete a delay sign-in request
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { id } = await params;

    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection('delay-signin-requests').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Delay sign-in request');
    }

    const data = doc.data()!;
    const userRole = authResult.user.claims.role;

    if (userRole !== 'admin' && data.employeeId !== authResult.user.uid) {
      return ErrorResponses.forbidden('You can only delete your own delay sign-in requests');
    }

    await adminDb.collection('delay-signin-requests').doc(id).delete();
    return NextResponse.json({ message: 'Delay sign-in request deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
