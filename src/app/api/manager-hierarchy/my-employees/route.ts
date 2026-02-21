import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/manager-hierarchy/my-employees
 * Get employees that the current user (manager) can assign tasks to
 * - Admins get all active employees
 * - Managers get only their assigned employees from manager-hierarchies
 * - Employees get empty array
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    const userId = authResult.user.uid;

    // Only managers and admins can assign tasks
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can assign tasks');
    }

    const { adminDb } = await import('@/lib/firebase-admin');

    // Admins can see all active employees
    if (userRole === 'admin') {
      const usersSnapshot = await adminDb
        .collection('users')
        .where('role', 'in', ['employee', 'manager'])
        .get();

      const employees = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || data.name || '',
          email: data.email || '',
          role: data.role || 'employee',
        };
      });

      return NextResponse.json(employees, { status: 200 });
    }

    // Managers can only see their assigned employees
    if (userRole === 'manager') {
      const hierarchySnapshot = await adminDb
        .collection('manager-hierarchies')
        .where('managerId', '==', userId)
        .limit(1)
        .get();

      if (hierarchySnapshot.empty) {
        // Manager has no employees assigned yet
        return NextResponse.json([], { status: 200 });
      }

      const hierarchy = hierarchySnapshot.docs[0].data();
      const employeeIds = hierarchy.employeeIds || [];

      if (employeeIds.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // Fetch employee details
      const employeeDocs = await Promise.all(
        employeeIds.map((id: string) => adminDb.collection('users').doc(id).get())
      );

      const employees = employeeDocs
        .filter((doc) => doc.exists)
        .map((doc) => {
          const data = doc.data()!;
          return {
            id: doc.id,
            name: data.displayName || data.name || '',
            email: data.email || '',
            role: data.role || 'employee',
          };
        });

      return NextResponse.json(employees, { status: 200 });
    }

    return NextResponse.json([], { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
