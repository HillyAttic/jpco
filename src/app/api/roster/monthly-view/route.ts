import { NextRequest, NextResponse } from 'next/server';
import { rosterAdminService } from '@/services/roster-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';
import { verifyAuthToken } from '@/lib/server-auth';

/**
 * GET /api/roster/monthly-view
 * Get monthly roster view with manager hierarchy filtering
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can view monthly roster');
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    // For managers, filter by assigned employees only
    let allowedUserIds: string[] | undefined = undefined;
    if (userRole === 'manager') {
      const { adminDb } = await import('@/lib/firebase-admin');
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', authResult.user.uid)
        .limit(1)
        .get();

      if (!hierarchySnapshot.empty) {
        const hierarchyData = hierarchySnapshot.docs[0].data();
        allowedUserIds = hierarchyData.employeeIds || [];
      } else {
        // Manager has no assigned employees
        allowedUserIds = [];
      }
    }

    const monthlyView = await rosterAdminService.getMonthlyRosterView(month, year, allowedUserIds);

    return NextResponse.json(monthlyView);
  } catch (error: any) {
    console.error('Error in GET /api/roster/monthly-view:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
