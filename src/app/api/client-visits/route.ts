import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/client-visits
 * Get all client visits (admin only)
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can view client visits');
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const search = searchParams.get('search') || undefined;

    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb.collection('client-visits');

    if (clientId) query = query.where('clientId', '==', clientId);
    if (employeeId) query = query.where('employeeId', '==', employeeId);

    query = query.orderBy('visitDate', 'desc');

    const snapshot = await query.get();
    let visits = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        visitDate: data.visitDate?.toDate ? data.visitDate.toDate().toISOString() : data.visitDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });

    // Apply date and search filters in memory to avoid composite index requirements
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      visits = visits.filter((v) => new Date(v.visitDate as string) >= startDate);
    }
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      visits = visits.filter((v) => new Date(v.visitDate as string) <= endDate);
    }
    if (search) {
      const s = search.toLowerCase();
      visits = visits.filter(
        (v: any) =>
          v.clientName?.toLowerCase().includes(s) ||
          v.employeeName?.toLowerCase().includes(s) ||
          v.taskTitle?.toLowerCase().includes(s)
      );
    }

    return NextResponse.json(visits, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/client-visits
 * Record a new client visit
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const body = await request.json();
    if (!body.clientId || !body.visitDate) {
      return ErrorResponses.badRequest('clientId and visitDate are required');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const visitData = {
      ...body,
      createdBy: authResult.user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('client-visits').add(visitData);

    return NextResponse.json(
      {
        id: docRef.id,
        ...visitData,
        visitDate: visitData.visitDate instanceof Date ? visitData.visitDate.toISOString() : visitData.visitDate,
        createdAt: visitData.createdAt.toISOString(),
        updatedAt: visitData.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
