import { NextRequest, NextResponse } from 'next/server';
import { rosterService } from '@/services/roster.service';

/**
 * GET /api/roster/monthly
 * Get monthly roster view for admin/manager
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Note: Role-based access control should be implemented in production
    // For now, we'll allow any authenticated user to access this endpoint
    // The frontend will handle role-based rendering

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Missing month or year parameter' },
        { status: 400 }
      );
    }

    // Get monthly roster view
    const monthlyView = await rosterService.getMonthlyRosterView(
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
