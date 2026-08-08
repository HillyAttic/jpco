import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { delaySigninRequestSchema } from '@/lib/attendance-validation';

const createDelaySigninSchema = z.object({
  attendanceRecordId: z.string().min(1, 'Attendance record ID is required'),
  shiftId: z.string().min(1, 'Shift ID is required'),
  shiftName: z.string().min(1, 'Shift name is required'),
  shiftStartTime: z.string().min(1, 'Shift start time is required'),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
});

/**
 * Helper to convert Firestore timestamps in a delay-signin document
 */
function convertDelaySigninDoc(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    clockInTime: data.clockInTime?.toDate ? data.clockInTime.toDate().toISOString() : data.clockInTime,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt,
  };
}

/**
 * GET /api/delay-signin-requests
 * Get delay sign-in requests with role-based filtering.
 * Fetches all docs then filters in memory to avoid Firestore composite index requirements.
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;

    const { adminDb } = await import('@/lib/firebase-admin');

    // Fetch all docs, then filter in memory (avoids composite index issues)
    const snapshot = await adminDb.collection('delay-signin-requests').get();
    let docs = snapshot.docs;

    // Role-based filtering
    if (userRole === 'employee') {
      docs = docs.filter((doc) => doc.data().employeeId === userId);
    } else if (userRole === 'manager') {
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', userId)
        .limit(1)
        .get();

      if (hierarchySnapshot.empty) {
        return NextResponse.json([], { status: 200 });
      }

      const hierarchy = hierarchySnapshot.docs[0].data();
      const employeeIds: string[] = hierarchy.employeeIds || [];
      const employeeIdSet = new Set(employeeIds);
      docs = docs.filter((doc) => employeeIdSet.has(doc.data().employeeId));
    }
    // Admin sees all

    // Apply filters
    if (status) {
      docs = docs.filter((doc) => doc.data().status === status);
    }
    if (employeeId) {
      docs = docs.filter((doc) => doc.data().employeeId === employeeId);
    }

    // Sort by createdAt descending
    docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    const requests = docs.map(convertDelaySigninDoc);
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/delay-signin-requests
 * Create a new delay sign-in request
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    const validation = createDelaySigninSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { attendanceRecordId, shiftId, shiftName, shiftStartTime, reason } = validation.data;
    const employeeId = authResult.user.uid;

    const { adminDb } = await import('@/lib/firebase-admin');

    // Get employee profile
    const userDoc = await adminDb.collection('users').doc(employeeId).get();
    const userData = userDoc.data();

    // Monthly limit check: max 2 pending/approved per month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlySnapshot = await adminDb
      .collection('delay-signin-requests')
      .where('employeeId', '==', employeeId)
      .get();

    const monthlyCount = monthlySnapshot.docs.filter((doc) => {
      const data = doc.data();
      const status = data.status;
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return (status === 'pending' || status === 'approved') &&
             createdAt >= startOfMonth && createdAt <= endOfMonth;
    }).length;

    if (monthlyCount >= 2) {
      return NextResponse.json(
        {
          error: 'Monthly limit reached',
          message: 'You have reached the maximum of 2 delay sign-in requests per month.',
          monthlyCount,
          maxMonthly: 2,
        },
        { status: 403 }
      );
    }

    // Check for duplicate submission within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicateSnapshot = await adminDb
      .collection('delay-signin-requests')
      .where('employeeId', '==', employeeId)
      .get();

    const isDuplicate = duplicateSnapshot.docs.some((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return data.attendanceRecordId === attendanceRecordId && createdAt > fiveMinutesAgo;
    });

    if (isDuplicate) {
      const duplicateDoc = duplicateSnapshot.docs.find((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        return data.attendanceRecordId === attendanceRecordId && createdAt > fiveMinutesAgo;
      });
      return NextResponse.json(
        {
          error: 'Duplicate request detected',
          message: 'A delay sign-in request for this attendance record was just submitted.',
          existingRequestId: duplicateDoc?.id,
        },
        { status: 409 }
      );
    }

    // Get the attendance record to calculate minutes late
    const attendanceDoc = await adminDb.collection('attendance-records').doc(attendanceRecordId).get();
    if (!attendanceDoc.exists) {
      return ErrorResponses.notFound('Attendance record');
    }

    const attendanceData = attendanceDoc.data()!;
    const clockInTime = attendanceData.clockIn?.toDate ? attendanceData.clockIn.toDate() : new Date(attendanceData.clockIn);

    // Calculate minutes late
    const shiftStartParts = shiftStartTime.split(':');
    const shiftStartMinutes = parseInt(shiftStartParts[0]) * 60 + parseInt(shiftStartParts[1]);
    const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
    const minutesLate = Math.max(0, clockInMinutes - shiftStartMinutes);

    const delayRequestData = {
      employeeId,
      employeeName: userData?.displayName || userData?.name || authResult.user.email || 'Unknown',
      employeeEmail: authResult.user.email || '',
      attendanceRecordId,
      shiftId,
      shiftName,
      shiftStartTime,
      clockInTime: clockInTime,
      minutesLate,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('delay-signin-requests').add(delayRequestData);

    // Send notifications
    try {
      const { sendNotification } = await import('@/lib/notifications/send-notification');
      const employeeName = delayRequestData.employeeName;
      const clockInStr = clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const notifBody = `${employeeName} signed in ${minutesLate} minutes late (at ${clockInStr}, shift starts at ${shiftStartTime}). Reason: ${reason}`;

      // Find manager or admins to notify
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('employeeIds', 'array-contains', employeeId)
        .limit(1)
        .get();

      let notifyIds: string[] = [];

      if (!hierarchySnapshot.empty) {
        notifyIds = [hierarchySnapshot.docs[0].data().managerId];
      } else {
        const adminsSnapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
        notifyIds = adminsSnapshot.docs.map((d) => d.id);
      }

      // Confirmation to employee
      await sendNotification({
        userIds: [employeeId],
        title: 'Delay Sign-In Request Submitted',
        body: `Your delay sign-in request (${minutesLate} min late at ${clockInStr}) has been submitted and is pending approval.`,
        data: { url: '/attendance', type: 'delay_signin_request' },
      });

      // Notification to manager/admins
      if (notifyIds.length > 0) {
        await sendNotification({
          userIds: notifyIds,
          title: 'New Delay Sign-In Request',
          body: notifBody,
          data: { url: '/admin/leave-approvals?tab=delay-signin', type: 'delay_signin_request' },
        });
      }
    } catch (notifError) {
      console.error('[delay-signin-requests] Error sending notifications:', notifError);
    }

    return NextResponse.json(
      {
        id: docRef.id,
        ...delayRequestData,
        clockInTime: delayRequestData.clockInTime.toISOString(),
        createdAt: delayRequestData.createdAt.toISOString(),
        updatedAt: delayRequestData.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
