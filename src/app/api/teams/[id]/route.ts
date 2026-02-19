import { NextRequest, NextResponse } from 'next/server';
import { teamAdminService } from '@/services/team-admin.service';
import { teamSchema } from '@/lib/validation';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/teams/[id] - Get a team by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const team = await teamAdminService.getById(id);

    if (!team) {
      return ErrorResponses.notFound('Team');
    }

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/teams/[id] - Update a team
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can update teams');
    }

    const { id } = await params;
    const body = await request.json();

    const partialTeamSchema = teamSchema.partial();
    const validationResult = partialTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const validatedData = validationResult.data;

    const existingTeam = await teamAdminService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    const updateData: any = { ...validatedData };

    // Use Admin SDK to look up employee names
    const { adminDb } = await import('@/lib/firebase-admin');

    if (validatedData.leaderId !== undefined) {
      if (validatedData.leaderId) {
        const leaderDoc = await adminDb.collection('employees').doc(validatedData.leaderId).get();
        updateData.leaderName = leaderDoc.exists ? leaderDoc.data()!.name || '' : '';
      } else {
        updateData.leaderName = '';
      }
    }

    if (validatedData.memberIds !== undefined) {
      const members = [];
      for (const memberId of validatedData.memberIds) {
        const empDoc = await adminDb.collection('employees').doc(memberId).get();
        if (empDoc.exists) {
          const emp = empDoc.data()!;
          members.push({ id: memberId, name: emp.name, avatar: undefined, role: emp.role });
        }
      }
      updateData.members = members;
    }

    const updatedTeam = await teamAdminService.update(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/teams/[id] - Delete a team
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete teams');
    }

    const { id } = await params;

    const existingTeam = await teamAdminService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    await teamAdminService.delete(id);

    return NextResponse.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}