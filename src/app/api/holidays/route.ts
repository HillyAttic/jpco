import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { getManagerTeams, holidayAppliesTo, holidayVisibleTo } from '@/lib/holiday-scope';

/**
 * GET /api/holidays
 *
 * Fetch holidays visible to the caller. Team-scoped holidays are filtered
 * server-side: managers see global holidays plus their own, employees see
 * global holidays plus their team's.
 *
 * Query Parameters:
 * - startDate (optional): ISO date string to filter holidays >= this date
 * - endDate (optional): ISO date string to filter holidays <= this date
 *
 * Returns: Array of holidays with id, date, name, description, scope,
 * createdBy and appliesTo ('all', or the employee ids the holiday covers).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userId = authResult.user.uid;
    const role = authResult.user.claims.role;

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let query: FirebaseFirestore.Query = adminDb.collection('holidays');

    // Filter by date range if provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      query = query
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'asc');
    } else if (startDateParam) {
      const startDate = new Date(startDateParam);
      query = query
        .where('date', '>=', startDate)
        .orderBy('date', 'asc');
    } else if (endDateParam) {
      const endDate = new Date(endDateParam);
      query = query
        .where('date', '<=', endDate)
        .orderBy('date', 'asc');
    } else {
      // No date filter, just order by date
      query = query.orderBy('date', 'asc');
    }

    const snapshot = await query.get();
    const teams = await getManagerTeams();

    const holidays = snapshot.docs
      .filter((doc) =>
        holidayVisibleTo(
          { scope: doc.data().scope, createdBy: doc.data().createdBy },
          userId,
          role,
          teams
        )
      )
      .map((doc) => {
        const data = doc.data();

        // Convert Firestore Timestamp to ISO string for JSON serialization
        let dateStr = '';
        if (data.date && typeof data.date.toDate === 'function') {
          dateStr = data.date.toDate().toISOString();
        } else if (typeof data.date === 'string') {
          dateStr = data.date;
        } else if (data.date && typeof data.date.seconds !== 'undefined') {
          dateStr = new Date(data.date.seconds * 1000).toISOString();
        }

        return {
          id: doc.id,
          date: dateStr,
          name: data.name || '',
          description: data.description || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          scope: data.scope === 'manager' ? 'manager' : 'global',
          createdBy: data.createdBy || null,
          appliesTo: holidayAppliesTo({ scope: data.scope, createdBy: data.createdBy }, teams),
        };
      });

    // Who marked each holiday, so the list can credit them. Only the uids that
    // actually appear, since legacy global holidays carry no createdBy at all.
    const creatorIds = [...new Set(holidays.map((h) => h.createdBy).filter(Boolean))] as string[];
    const creators = new Map<string, { name: string; role: string }>();
    if (creatorIds.length > 0) {
      const creatorDocs = await Promise.all(
        creatorIds.map((uid) => adminDb.collection('users').doc(uid).get())
      );
      creatorDocs.forEach((doc) => {
        const u = doc.exists ? doc.data()! : null;
        if (u) {
          creators.set(doc.id, {
            name: u.displayName || u.name || u.email || '',
            role: u.role || 'employee',
          });
        }
      });
    }

    return NextResponse.json(
      holidays.map((h) => {
        const creator = h.createdBy ? creators.get(h.createdBy) : undefined;
        return {
          ...h,
          createdByName: creator?.name || null,
          createdByRole: creator?.role || null,
        };
      })
    );
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/holidays
 *
 * Create a holiday. The scope is decided by the server, never by the client:
 * a manager's holiday covers only their own team, an admin's covers everyone.
 *
 * Body: { date: string, name: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { uid, claims } = authResult.user;
    const role = claims.role;

    if (!['admin', 'manager'].includes(role)) {
      return ErrorResponses.forbidden('Only admins and managers can add holidays');
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    const date = body.date;

    if (!date || !name) {
      return ErrorResponses.badRequest('date and name are required');
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return ErrorResponses.badRequest('Invalid date');
    }

    const ref = await adminDb.collection('holidays').add({
      date: Timestamp.fromDate(dateObj),
      name,
      description: (body.description || '').trim(),
      createdAt: Timestamp.now(),
      // Recorded for everyone so the list can show who marked it. Only the
      // `scope` field decides reach — an admin's holiday stays company-wide.
      createdBy: uid,
      ...(role === 'manager' ? { scope: 'manager' } : {}),
    });

    return NextResponse.json({ success: true, id: ref.id }, { status: 201 });
  } catch (error) {
    console.error('Error adding holiday:', error);
    return handleApiError(error);
  }
}
