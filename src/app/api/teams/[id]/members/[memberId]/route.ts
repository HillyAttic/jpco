import { NextRequest, NextResponse } from 'next/server';
import { teamAdminService } from '@/services/team-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const updateMemberRoleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
});

/**
 * DELETE /api/teams/[id]/members/[memberId] - Remove a member from a team
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can remove team members');
    }

    const { id, memberId } = await params;

    const existingTeam = await teamAdminService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    const memberExists = existingTeam.members.some((m: any) => m.id === memberId);
    if (!memberExists) {
      return ErrorResponses.notFound('Member not found in team');
    }

    const updatedTeam = await teamAdminService.removeMember(id, memberId);

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Member removed from team successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/teams/[id]/members/[memberId] - Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can update member roles');
    }

    const { id, memberId } = await params;
    const body = await request.json();

    const validationResult = updateMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { role } = validationResult.data;

    const existingTeam = await teamAdminService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    const memberExists = existingTeam.members.some((m: any) => m.id === memberId);
    if (!memberExists) {
      return ErrorResponses.notFound('Member not found in team');
    }

    const updatedTeam = await teamAdminService.updateMemberRole(id, memberId, role.trim());

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}