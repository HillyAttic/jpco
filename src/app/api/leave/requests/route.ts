import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/leave/requests
 * GET leave requests using Admin SDK
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

    const { adminDb } = await import('@/lib/firebase-admin');
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const leaveTypeId = searchParams.get('leaveTypeId') || undefined;

    let query: FirebaseFirestore.Query = adminDb.collection('leave-requests');

    // Employees can only see their own requests
    if (userRole === 'employee') {
      query = query.where('employeeId', '==', userId);
    } else if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
    }

    if (status) query = query.where('status', '==', status);
    if (leaveTypeId) query = query.where('leaveTypeId', '==', leaveTypeId);

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });

    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/leave/requests
 * Create a leave request using Admin SDK
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();

    if (!body.startDate || !body.endDate || !body.leaveType) {
      return ErrorResponses.badRequest('startDate, endDate, and leaveType are required');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    const leaveData = {
      employeeId: body.employeeId || authResult.user.uid,
      employeeName: body.employeeName || authResult.user.email || '',
      leaveType: body.leaveType,
      leaveTypeId: body.leaveTypeId || body.leaveType,
      startDate: Timestamp.fromDate(new Date(body.startDate)),
      endDate: Timestamp.fromDate(new Date(body.endDate)),
      reason: body.reason || '',
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await adminDb.collection('leave-requests').add(leaveData);

    return NextResponse.json(
      {
        id: docRef.id,
        ...leaveData,
        startDate: new Date(body.startDate).toISOString(),
        endDate: new Date(body.endDate).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
