import { NextRequest, NextResponse } from 'next/server';
import { teamAdminService } from '@/services/team-admin.service';
import { teamSchema } from '@/lib/validation';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/teams - List teams with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager', 'employee'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get('status') || undefined,
      department: searchParams.get('department') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    const teams = await teamAdminService.getAll(cleanFilters);

    return NextResponse.json({ success: true, data: teams, count: teams.length });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/teams - Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can create teams');
    }

    const body = await request.json();

    const validationResult = teamSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const validatedData = validationResult.data;

    // Use Admin SDK to look up employee names
    const { adminDb } = await import('@/lib/firebase-admin');

    let leaderName = '';
    if (validatedData.leaderId) {
      const leaderDoc = await adminDb.collection('employees').doc(validatedData.leaderId).get();
      if (leaderDoc.exists) {
        leaderName = leaderDoc.data()!.name || '';
      }
    }

    const members = [];
    if (validatedData.memberIds && validatedData.memberIds.length > 0) {
      for (const memberId of validatedData.memberIds) {
        const empDoc = await adminDb.collection('employees').doc(memberId).get();
        if (empDoc.exists) {
          const emp = empDoc.data()!;
          members.push({ id: memberId, name: emp.name, avatar: undefined, role: emp.role });
        }
      }
    }

    const team = await teamAdminService.create({
      name: validatedData.name,
      description: validatedData.description || '',
      leaderId: validatedData.leaderId,
      leaderName,
      memberIds: validatedData.memberIds || [],
      members,
      status: validatedData.status || 'active',
    });

    return NextResponse.json(
      { success: true, data: team, message: 'Team created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}