import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/client-visits/stats
 * Get client visit statistics (admin/manager only)
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
      return ErrorResponses.forbidden('Only admins and managers can view client visit statistics');
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb
      .collection('client-visits')
      .orderBy('visitDate', 'desc');

    const snapshot = await query.get();
    let visits = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        visitDate: data.visitDate?.toDate ? data.visitDate.toDate().toISOString() : data.visitDate,
      };
    });

    // Apply date filters in memory
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      visits = visits.filter((v) => new Date(v.visitDate as string) >= startDate);
    }
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      visits = visits.filter((v) => new Date(v.visitDate as string) <= endDate);
    }

    // Compute stats
    const uniqueClients = new Set(visits.map((v: any) => v.clientId));
    const uniqueEmployees = new Set(visits.map((v: any) => v.employeeId));

    const clientCounts = new Map<string, { name: string; count: number }>();
    const employeeCounts = new Map<string, { name: string; count: number }>();

    visits.forEach((v: any) => {
      const c = clientCounts.get(v.clientId);
      clientCounts.set(v.clientId, { name: v.clientName || v.clientId, count: (c?.count ?? 0) + 1 });
      const e = employeeCounts.get(v.employeeId);
      employeeCounts.set(v.employeeId, { name: v.employeeName || v.employeeId, count: (e?.count ?? 0) + 1 });
    });

    const stats = {
      totalVisits: visits.length,
      uniqueClients: uniqueClients.size,
      uniqueEmployees: uniqueEmployees.size,
      visitsByClient: Array.from(clientCounts.values())
        .map((v) => ({ clientName: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count),
      visitsByEmployee: Array.from(employeeCounts.values())
        .map((v) => ({ employeeName: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count),
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
