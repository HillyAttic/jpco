import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const createLeaveSchema = z.object({
  leaveType: z.enum(['sick', 'casual', 'vacation', 'personal', 'other']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  reason: z.string().min(1).max(500),
});

/**
 * GET /api/leave-requests
 * Get all leave requests.
 * Uses Admin SDK to bypass Firestore security rules on the server side.
 * Previously used client-SDK leaveService which caused 403 Forbidden errors
 * because the client SDK runs unauthenticated in API routes.
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    const userId = authResult.user.uid;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const leaveType = searchParams.get('leaveType') || undefined;

    // Use Admin SDK to bypass Firestore security rules on the server
    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb.collection('leave-requests');

    // Employees can only see their own requests; managers/admins see all
    if (userRole === 'employee') {
      query = query.where('employeeId', '==', userId);
    } else if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    if (leaveType) {
      query = query.where('leaveType', '==', leaveType);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    // Collect unique approver UIDs that are missing approverName so we can batch-resolve them
    const missingApproverIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.approverName && data.approvedBy) {
        missingApproverIds.add(data.approvedBy);
      }
    });

    // Batch fetch approver names for old records
    const approverNameMap: Record<string, string> = {};
    if (missingApproverIds.size > 0) {
      const approverDocs = await Promise.all(
        Array.from(missingApproverIds).map((uid) => adminDb.collection('users').doc(uid).get())
      );
      approverDocs.forEach((doc) => {
        if (doc.exists) {
          const d = doc.data()!;
          approverNameMap[doc.id] = d.displayName || d.name || d.email || 'Unknown';
        }
      });
    }

    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Backfill approverName for old records that only have approvedBy UID
        approverName: data.approverName || (data.approvedBy ? approverNameMap[data.approvedBy] : undefined),
        // Convert Firestore Timestamps to ISO strings for JSON serialization
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
      };
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/leave-requests
 * Create a new leave request
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const validation = createLeaveSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { leaveType, startDate, endDate, reason } = validation.data;

    // Use Admin SDK to get user profile and create leave request
    const { adminDb } = await import('@/lib/firebase-admin');
    const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get();
    const userData = userDoc.data();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequestData = {
      employeeId: authResult.user.uid,
      employeeName: userData?.displayName || userData?.name || authResult.user.email || 'Unknown',
      employeeEmail: authResult.user.email || '',
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('leave-requests').add(leaveRequestData);

    // Notify all admins and managers about the new leave request
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const adminsSnapshot = await adminDb.collection('users')
        .where('role', 'in', ['admin', 'manager'])
        .get();
      const adminIds = adminsSnapshot.docs.map((d) => d.id);
      if (adminIds.length > 0) {
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const employeeName = leaveRequestData.employeeName;
        await sendNotification({
          userIds: adminIds,
          title: 'New Leave Request',
          body: `${employeeName} requested ${leaveType} leave (${totalDays} day${totalDays > 1 ? 's' : ''}) from ${startStr} to ${endStr}`,
          data: { url: '/admin/leave-approvals', type: 'leave_request' },
        });
      }
    } catch (notifError) {
      console.error('[leave-requests] Failed to send admin notifications:', notifError);
    }

    return NextResponse.json(
      {
        id: docRef.id,
        ...leaveRequestData,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        createdAt: leaveRequestData.createdAt.toISOString(),
        updatedAt: leaveRequestData.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
