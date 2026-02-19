import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponses } from '@/lib/api-error-handler';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using Admin SDK
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const status = searchParams.get('status') || undefined;

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Use Admin SDK to bypass Firestore security rules on the server.
    // The client SDK attendanceService cannot be used server-side as it
    // runs unauthenticated and gets blocked by security rules → 500 error.
    const { adminDb } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    let query: FirebaseFirestore.Query = adminDb.collection('attendance-records');

    // Employees can only see their own records
    if (userRole === 'employee') {
      query = query.where('employeeId', '==', authResult.user.uid);
    } else if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
    }

    if (startDate && !isNaN(startDate.getTime())) {
      query = query.where('clockIn', '>=', Timestamp.fromDate(startDate));
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('clockIn', 'desc');

    const snapshot = await query.get();
    let records = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings for JSON serialization
        clockIn: data.clockIn?.toDate ? data.clockIn.toDate().toISOString() : data.clockIn,
        clockOut: data.clockOut?.toDate ? data.clockOut.toDate().toISOString() : data.clockOut,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        breaks: (data.breaks || []).map((b: any) => ({
          ...b,
          startTime: b.startTime?.toDate ? b.startTime.toDate().toISOString() : b.startTime,
          endTime: b.endTime?.toDate ? b.endTime.toDate().toISOString() : b.endTime,
        })),
      };
    });

    // Apply end date filter client-side to avoid composite index requirements
    if (endDate && !isNaN(endDate.getTime())) {
      records = records.filter((record) => {
        const clockIn = new Date(record.clockIn as string);
        return clockIn <= endDate;
      });
    }

    return NextResponse.json(records, { status: 200 });
  } catch (error: any) {
    console.error('Get attendance records error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message || 'Failed to get attendance records',
      },
      { status: 500 }
    );
  }
}
