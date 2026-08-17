/**
 * Relieving Letters API - Main CRUD Endpoint
 * GET: List letters (role-based access)
 * POST: Create new letter (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, withManagerAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { RelievingLetter } from '@/types/relieving-letter.types';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { relievingLetterCreateSchema } from '@/lib/relieving-letter-validation';
import { generateLetterNumber } from '@/lib/relieving-letter-utils';

/**
 * GET /api/relieving-letters
 * List relieving letters with role-based access control
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const includeAll = searchParams.get('includeAll') === 'true';

    // Build Firestore query filters
    const filters: { employeeId?: string; accessGranted?: boolean } = {};
    const userRole = authResult.user.claims.role;

    // Role-based access logic (mirrors payroll slips)
    if (authResult.user.claims.role === 'employee') {
      // Employees: ALWAYS forced to their own uid, always require accessGranted
      filters.employeeId = authResult.user.uid;
      filters.accessGranted = true;
    } else if (employeeId) {
      // Admins/Managers explicitly requesting a specific employee
      // Managers can only request their assigned employees
      if (userRole === 'manager') {
        const { hasAccessToEmployee } = await import('@/lib/manager-access');
        if (!(await hasAccessToEmployee(authResult.user.uid, userRole, employeeId))) {
          return ErrorResponses.forbidden('You can only view letters for your assigned employees');
        }
      }
      filters.employeeId = employeeId;
    } else if (includeAll && userRole === 'admin') {
      // Admins with includeAll=true — list all letters (no uid/accessGranted filter)
    } else if (includeAll && userRole === 'manager') {
      // Managers with includeAll=true — list only their assigned employees' letters
      const { getAccessibleEmployeeIds } = await import('@/lib/manager-access');
      const accessibleIds = await getAccessibleEmployeeIds(authResult.user.uid, userRole);
      // Fetch all letters and filter to accessible employees
      const allLetters = await adminDb.collection('relieving-letters').get();
      const filteredLetters = allLetters.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((letter: any) =>
          accessibleIds.includes(letter.employeeId) &&
          (filters.accessGranted === undefined || letter.accessGranted === filters.accessGranted)
        );
      console.log(`[API /api/relieving-letters] GET - Manager ${authResult.user.uid}: returning ${filteredLetters.length} letter(s)`);
      return NextResponse.json(filteredLetters, { status: 200 });
    } else {
      // Admins/Managers WITHOUT employeeId — force to their own uid (self-service)
      filters.employeeId = authResult.user.uid;
      filters.accessGranted = true;
    }

    console.log(`[API /api/relieving-letters] GET - User: ${authResult.user.uid}, Role: ${authResult.user.claims.role}, Filters:`, JSON.stringify(filters));

    // Build Firestore query
    let firestoreQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection('relieving-letters');
    if (filters.employeeId) {
      firestoreQuery = firestoreQuery.where('employeeId', '==', filters.employeeId);
    }
    if (filters.accessGranted !== undefined) {
      firestoreQuery = firestoreQuery.where('accessGranted', '==', filters.accessGranted);
    }

    const snapshot = await firestoreQuery.get();
    const letters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as (RelievingLetter & { id: string })[];

    // Defense-in-depth: filter returned array to enforce employeeId match
    let filteredLetters = letters;
    if (filters.employeeId) {
      filteredLetters = letters.filter(letter =>
        letter.employeeId === filters.employeeId &&
        (filters.accessGranted !== undefined ? letter.accessGranted === filters.accessGranted : true)
      );

      if (letters.length !== filteredLetters.length) {
        console.error(
          `[API /api/relieving-letters] SECURITY VIOLATION - Filtered ${letters.length - filteredLetters.length} ` +
          `letter(s) that didn't match the enforced filter for user ${authResult.user.uid}`
        );
      }
    }

    console.log(`[API /api/relieving-letters] GET - Returning ${filteredLetters.length} letter(s)`);
    return NextResponse.json(filteredLetters, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/relieving-letters
 * Create new relieving letter (admin/manager only)
 */
export const POST = withManagerAuth(async (request: AuthenticatedRequest) => {
  try {
    const { uid } = request.user!;
    const body = await request.json();

    console.log(`[API /api/relieving-letters] POST - User: ${uid}, Creating letter for employee:`, body.employeeId);

    // Validate input (create schema omits letterNumber and createdBy — server generates those)
    const validation = relievingLetterCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Generate letter number
    const letterNumber = await generateLetterNumber();

    // Create letter document
    const letterData = {
      ...validation.data,
      letterNumber,
      createdBy: uid,
      createdAt: Timestamp.now(),
    };

    const docRef = await adminDb.collection('relieving-letters').add(letterData);
    const createdLetter = { id: docRef.id, ...letterData };

    console.log(`[API /api/relieving-letters] POST - Created letter ${letterNumber} with id ${docRef.id}`);
    return NextResponse.json(createdLetter, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
