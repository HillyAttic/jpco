import { NextRequest, NextResponse } from 'next/server';
import { rosterAdminService } from '@/services/roster-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/roster/monthly
 * Get monthly roster view for admin/manager
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Missing month or year parameter' },
        { status: 400 }
      );
    }

    const monthlyView = await rosterAdminService.getMonthlyRosterView(
      parseInt(month),
      parseInt(year)
    );

    return NextResponse.json(monthlyView);
  } catch (error: any) {
    console.error('Error in GET /api/roster/monthly:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
