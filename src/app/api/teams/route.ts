import { NextRequest, NextResponse } from 'next/server';
import { teamAdminService } from '@/services/team-admin.service';
import { employeeService } from '@/services/employee.service';
import { teamSchema } from '@/lib/validation';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/teams - List teams with optional filters
 * Supports filtering by status, department, and search
 * Validates Requirements: 4.2, 4.9
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Decode JWT token to get user ID (basic validation)
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.user_id || payload.sub;
      
      if (!userId) {
        return ErrorResponses.unauthorized();
      }
    } catch (error) {
      return ErrorResponses.unauthorized();
    }

    console.log(`[Teams API] User ${userId} fetching teams`);

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

    const teams = await teamAdminService.getAll(cleanFilters);

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
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized();
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Decode JWT token to get user ID
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.user_id || payload.sub;
      
      if (!userId) {
        return ErrorResponses.unauthorized();
      }
    } catch (error) {
      return ErrorResponses.unauthorized();
    }

    console.log(`[Teams API] User ${userId} creating team`);

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

    // Get leader name if leaderId is provided
    let leaderName = '';
    if (validatedData.leaderId) {
      const leader = await employeeService.getById(validatedData.leaderId);
      if (leader) {
        leaderName = leader.name;
      }
    }

    // Get member details if memberIds are provided
    const members = [];
    if (validatedData.memberIds && validatedData.memberIds.length > 0) {
      for (const memberId of validatedData.memberIds) {
        const employee = await employeeService.getById(memberId);
        if (employee) {
          members.push({
            id: employee.id!,
            name: employee.name,
            avatar: undefined,
            role: employee.role,
          });
        }
      }
    }

    // Create the team using Admin SDK
    const team = await teamAdminService.create({
      name: validatedData.name,
      description: validatedData.description || '',
      leaderId: validatedData.leaderId,
      leaderName: leaderName,
      memberIds: validatedData.memberIds || [],
      members: members,
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