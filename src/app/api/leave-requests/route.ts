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
    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
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
