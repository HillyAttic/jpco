import { NextRequest, NextResponse } from 'next/server';
import { rosterService } from '@/services/roster.service';

/**
 * GET /api/roster
 * Get roster entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build filters
    const filters: any = {};
    if (userId) filters.userId = userId;
    if (month) filters.month = parseInt(month);
    if (year) filters.year = parseInt(year);

    // Get roster entries
    const entries = await rosterService.getRosterEntries(filters);

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
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.userName || !body.activityName || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create roster entry
    const entry = await rosterService.createRosterEntry({
      userId: body.userId,
      userName: body.userName,
      activityName: body.activityName,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      month: body.month,
      year: body.year,
      notes: body.notes,
      createdBy: body.userId,
    });

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
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing roster entry ID' },
        { status: 400 }
      );
    }

    // Update roster entry
    const updates: any = {};
    if (body.activityName) updates.activityName = body.activityName;
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    if (body.month) updates.month = body.month;
    if (body.year) updates.year = body.year;
    if (body.notes !== undefined) updates.notes = body.notes;

    const entry = await rosterService.updateRosterEntry(body.id, updates);

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
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing roster entry ID' },
        { status: 400 }
      );
    }

    // Delete roster entry
    await rosterService.deleteRosterEntry(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/roster:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
