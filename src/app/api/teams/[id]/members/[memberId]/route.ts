import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '@/services/team.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Schema for updating member role
const updateMemberRoleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
});

/**
 * DELETE /api/teams/[id]/members/[memberId] - Remove a member from a team
 * Validates Requirements: 4.6
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id, memberId } = await params;
    
    // Check if team exists
    const existingTeam = await teamService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    // Check if member exists in team
    const memberExists = existingTeam.members.some(member => member.id === memberId);
    if (!memberExists) {
      return ErrorResponses.notFound('Member not found in team');
    }

    // Remove the member from the team
    const updatedTeam = await teamService.removeMember(id, memberId);

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
 * Validates Requirements: 4.5, 4.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id, memberId } = await params;
    const body = await request.json();

    // Validate the request body
    const validationResult = updateMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { role } = validationResult.data;

    // Check if team exists
    const existingTeam = await teamService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    // Check if member exists in team
    const memberExists = existingTeam.members.some(member => member.id === memberId);
    if (!memberExists) {
      return ErrorResponses.notFound('Member not found in team');
    }

    // Update the member's role
    const updatedTeam = await teamService.updateMemberRole(id, memberId, role.trim());

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}