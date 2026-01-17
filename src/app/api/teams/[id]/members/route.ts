import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '@/services/team.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Schema for adding a member
const addMemberSchema = z.object({
  id: z.string().min(1, 'Member ID is required'),
  name: z.string().min(1, 'Member name is required'),
  avatar: z.string().optional(),
  role: z.string().min(1, 'Member role is required'),
});

/**
 * POST /api/teams/[id]/members - Add a member to a team
 * Validates Requirements: 4.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const body = await request.json();

    // Validate the request body
    const validationResult = addMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const validatedData = validationResult.data;

    // Check if team exists
    const existingTeam = await teamService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    // Add the member to the team
    const updatedTeam = await teamService.addMember(id, {
      id: validatedData.id,
      name: validatedData.name,
      avatar: validatedData.avatar,
      role: validatedData.role,
    });

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Member added to team successfully',
    });
  } catch (error) {
    // Handle specific service errors
    if (error instanceof Error && error.message === 'Member already exists in team') {
      return ErrorResponses.conflict('Member already exists in team');
    }

    return handleApiError(error);
  }
}