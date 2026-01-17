import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '@/services/team.service';
import { teamSchema } from '@/lib/validation';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/teams/[id] - Get a team by ID
 * Validates Requirements: 4.4
 */
export async function GET(
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
    const team = await teamService.getById(id);

    if (!team) {
      return ErrorResponses.notFound('Team');
    }

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/teams/[id] - Update a team
 * Validates Requirements: 4.2
 */
export async function PUT(
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

    // Validate the request body (partial update)
    const partialTeamSchema = teamSchema.partial();
    const validationResult = partialTeamSchema.safeParse(body);
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

    // Update the team
    const updatedTeam = await teamService.update(id, validatedData);

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
 * Validates Requirements: 4.10
 */
export async function DELETE(
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
    
    // Check if team exists
    const existingTeam = await teamService.getById(id);
    if (!existingTeam) {
      return ErrorResponses.notFound('Team');
    }

    // Delete the team
    await teamService.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}