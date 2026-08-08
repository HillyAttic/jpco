import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/delay-signin-requests/count?employeeId=xxx&month=YYYY-MM
 * Get the monthly count of pending/approved delay sign-in requests for an employee.
 * Fetches all docs then filters in memory to avoid Firestore composite index issues.
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || authResult.user.uid;
    const monthParam = searchParams.get('month');

    // Default to current month if not provided
    let startDate: Date;
    let endDate: Date;

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Fetch all docs for this employee, then filter in memory
    const snapshot = await adminDb
      .collection('delay-signin-requests')
      .where('employeeId', '==', employeeId)
      .get();

    const count = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const status = data.status;
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return (status === 'pending' || status === 'approved') &&
             createdAt >= startDate && createdAt <= endDate;
    }).length;

    return NextResponse.json({
      count,
      maxMonthly: 2,
      remaining: Math.max(0, 2 - count),
      month: monthParam || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
