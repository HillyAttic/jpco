import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const createHierarchySchema = z.object({
  managerId: z.string().min(1),
  managerName: z.string().min(1),
  managerEmail: z.string().email(),
  employeeIds: z.array(z.string()),
});

/**
 * GET /api/manager-hierarchy
 * Get manager hierarchies (admin only)
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
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only admins and managers can view manager hierarchies');
    }

    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId') || undefined;

    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb.collection('manager-hierarchies');

    if (managerId) {
      query = query.where('managerId', '==', managerId);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const hierarchies = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });

    return NextResponse.json(hierarchies, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/manager-hierarchy
 * Create or update manager hierarchy (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only admins can create manager hierarchies');
    }

    const body = await request.json();
    const validation = createHierarchySchema.safeParse(body);

    if (!validation.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { managerId, managerName, managerEmail, employeeIds } = validation.data;

    const { adminDb } = await import('@/lib/firebase-admin');

    // Get employee details from Admin SDK
    const employeeDocs = await Promise.all(
      employeeIds.map((id) => adminDb.collection('users').doc(id).get())
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

    // Check if hierarchy already exists for this manager
    const existing = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', managerId)
      .limit(1)
      .get();

    let hierarchyId: string;
    const hierarchyData = {
      managerId,
      managerName,
      managerEmail,
      employeeIds,
      employees,
      updatedAt: new Date(),
    };

    if (!existing.empty) {
      // Update existing
      hierarchyId = existing.docs[0].id;
      await adminDb.collection('manager-hierarchies').doc(hierarchyId).update(hierarchyData);
    } else {
      // Create new
      const docRef = await adminDb.collection('manager-hierarchies').add({
        ...hierarchyData,
        createdBy: authResult.user.uid,
        createdAt: new Date(),
      });
      hierarchyId = docRef.id;
    }

    return NextResponse.json(
      {
        id: hierarchyId,
        ...hierarchyData,
        updatedAt: hierarchyData.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
