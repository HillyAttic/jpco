import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '@/services/team.service';
import { teamSchema } from '@/lib/validation';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/teams - List teams with optional filters
 * Supports filtering by status, department, and search
 * Validates Requirements: 4.2, 4.9
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      department: searchParams.get('department') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    );

    const teams = await teamService.getAll(cleanFilters);

    return NextResponse.json({
      success: true,
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/teams - Create a new team
 * Validates Requirements: 4.2
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const body = await request.json();

    // Validate the request body
    const validationResult = teamSchema.safeParse(body);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const validatedData = validationResult.data;

    // Create the team
    const team = await teamService.create({
      name: validatedData.name,
      description: validatedData.description || '',
      leaderId: validatedData.leaderId,
      leaderName: '', // This will be populated by the service if needed
      members: [], // Start with empty members array
      department: validatedData.department,
      status: validatedData.status || 'active',
    });

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team created successfully',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}