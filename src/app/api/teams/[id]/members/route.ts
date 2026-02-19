import { NextRequest, NextResponse } from 'next/server';
import { teamAdminService } from '@/services/team-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

const addMemberSchema = z.object({
  id: z.string().min(1, 'Member ID is required'),
  name: z.string().min(1, 'Member name is required'),
  avatar: z.string().optional(),
  role: z.string().min(1, 'Member role is required'),
});

/**
 * POST /api/teams/[id]/members - Add a member to a team
 */
export async function POST(
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
      return ErrorResponses.forbidden('Only managers and admins can add team members');
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = addMemberSchema.safeParse(body);
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

    const updatedTeam = await teamAdminService.addMember(id, {
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
    if (error instanceof Error && error.message === 'Member already exists in team') {
      return ErrorResponses.conflict('Member already exists in team');
    }
    return handleApiError(error);
  }
}