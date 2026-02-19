import { NextRequest, NextResponse } from 'next/server';
import { seedEmployees } from '@/scripts/seed-employees';
import { ErrorResponses } from '@/lib/api-error-handler';

/**
 * POST /api/employees/seed
 * Seed initial employees in Firestore
 * This endpoint is for development/setup purposes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Admin access required');
    }

    const result = await seedEmployees();
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error seeding employees:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed employees',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}