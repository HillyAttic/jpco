import { NextRequest, NextResponse } from 'next/server';
import { rosterAdminService } from '@/services/roster-admin.service';
import { ErrorResponses } from '@/lib/api-error-handler';
import { verifyAuthToken } from '@/lib/server-auth';

/**
 * GET /api/roster
 * Get roster entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    const entries = await rosterAdminService.getRosterEntries({ userId, month, year });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error in GET /api/roster:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roster
 * Create a new roster entry
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can create roster entries');
    }

    const body = await request.json();

    if (!body.userId || !body.userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const taskType = body.taskType || 'multi';

    if (taskType === 'multi') {
      if (!body.activityName || !body.startDate || !body.endDate) {
        return NextResponse.json(
          { error: 'Missing required fields for multi task' },
          { status: 400 }
        );
      }
    } else if (taskType === 'single') {
      if (!body.clientId || !body.taskDetail || !body.timeStart || !body.timeEnd) {
        return NextResponse.json(
          { error: 'Missing required fields for single task' },
          { status: 400 }
        );
      }
    }

    const entryData: any = { taskType, userId: body.userId, userName: body.userName };

    if (taskType === 'multi') {
      entryData.activityName = body.activityName;
      entryData.startDate = new Date(body.startDate);
      entryData.endDate = new Date(body.endDate);
      entryData.month = body.month;
      entryData.year = body.year;
      entryData.notes = body.notes;
      entryData.createdBy = body.userId;
    } else {
      entryData.clientId = body.clientId;
      entryData.clientName = body.clientName;
      entryData.taskDetail = body.taskDetail;
      entryData.timeStart = new Date(body.timeStart);
      entryData.timeEnd = new Date(body.timeEnd);
    }

    const entry = await rosterAdminService.createRosterEntry(entryData);

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/roster:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roster
 * Update a roster entry
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can update roster entries');
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Missing roster entry ID' }, { status: 400 });
    }

    const updates: any = {};
    if (body.activityName) updates.activityName = body.activityName;
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    if (body.month) updates.month = body.month;
    if (body.year) updates.year = body.year;
    if (body.notes !== undefined) updates.notes = body.notes;

    const entry = await rosterAdminService.updateRosterEntry(body.id, updates);

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error in PUT /api/roster:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roster
 * Delete a roster entry
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete roster entries');
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing roster entry ID' }, { status: 400 });
    }

    await rosterAdminService.deleteRosterEntry(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/roster:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
