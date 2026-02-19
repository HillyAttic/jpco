import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const employeeIdsSchema = z.object({
  employeeIds: z.array(z.string()),
});

/**
 * GET /api/manager-hierarchy/[managerId]/employees
 * Get employees under a manager
 * Uses Admin SDK to bypass Firestore security rules.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    const { managerId } = await params;

    // Managers can view their own employees, admins can view all
    if (userRole === 'manager' && authResult.user.uid !== managerId) {
      return ErrorResponses.forbidden('You can only view your own employees');
    }

    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const snapshot = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', managerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const hierarchy = snapshot.docs[0].data();
    return NextResponse.json(hierarchy.employees || [], { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/manager-hierarchy/[managerId]/employees
 * Add employees to a manager (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can add employees to managers');
    }

    const { managerId } = await params;
    const body = await request.json();
    const validation = employeeIdsSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Find existing hierarchy
    const snapshot = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', managerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return ErrorResponses.notFound('Manager hierarchy');
    }

    const docRef = snapshot.docs[0].ref;
    const existing = snapshot.docs[0].data();
    const updatedIds = [...new Set([...(existing.employeeIds || []), ...validation.data.employeeIds])];

    // Get employee details
    const employeeDocs = await Promise.all(
      updatedIds.map((id) => adminDb.collection('users').doc(id).get())
    );
    const employees = employeeDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data()!;
        return {
          id: doc.id,
          name: data.displayName || data.name || '',
          email: data.email || '',
          department: data.role || data.department || '',
        };
      });

    await docRef.update({ employeeIds: updatedIds, employees, updatedAt: new Date() });

    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/manager-hierarchy/[managerId]/employees
 * Remove employees from a manager (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can remove employees from managers');
    }

    const { managerId } = await params;
    const body = await request.json();
    const validation = employeeIdsSchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const snapshot = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', managerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return ErrorResponses.notFound('Manager hierarchy');
    }

    const docRef = snapshot.docs[0].ref;
    const existing = snapshot.docs[0].data();
    const updatedIds = (existing.employeeIds || []).filter(
      (id: string) => !validation.data.employeeIds.includes(id)
    );

    // Get employee details
    const employeeDocs = await Promise.all(
      updatedIds.map((id: string) => adminDb.collection('users').doc(id).get())
    );
    const employees = employeeDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data()!;
        return {
          id: doc.id,
          name: data.displayName || data.name || '',
          email: data.email || '',
          department: data.role || data.department || '',
        };
      });

    await docRef.update({ employeeIds: updatedIds, employees, updatedAt: new Date() });

    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
