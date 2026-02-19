import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/debug/user-profile?email=xxx
 * Debug endpoint to check user profile in Firestore
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
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const querySnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .get();

    if (querySnapshot.empty) {
      return NextResponse.json({
        found: false,
        message: 'No user document found with this email',
        email,
        suggestion: 'The user account may not have been created in the users collection',
      });
    }

    const userDocs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      found: true,
      count: userDocs.length,
      users: userDocs,
      message: userDocs.length > 1 ? 'Warning: Multiple users found with same email!' : 'User found',
    });
  } catch (error) {
    console.error('Error checking user profile:', error);
    return NextResponse.json(
      {
        error: 'Failed to check user profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
