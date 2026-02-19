import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/server-auth';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/holidays
 * 
 * Fetch holidays from Firestore using Admin SDK
 * 
 * Query Parameters:
 * - startDate (optional): ISO date string to filter holidays >= this date
 * - endDate (optional): ISO date string to filter holidays <= this date
 * 
 * Returns: Array of holiday objects with id, date, name, description
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized(authResult.error);
    }

    // Get query parameters
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
    
    const holidays = snapshot.docs.map(doc => {
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
      };
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return ErrorResponses.internalError('Failed to fetch holidays');
  }
}
