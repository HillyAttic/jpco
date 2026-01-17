import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { userManagementService } from '@/services/user-management.service';
import { UserRole } from '@/types/auth.types';

/**
 * GET /api/admin/users - Get all users (admin only)
 */
export const GET = withAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole | null;
    const department = searchParams.get('department');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters: any = {};
    if (role && role !== 'all') filters.role = role;
    if (department && department !== 'all') filters.department = department;
    if (search) filters.searchTerm = search;
    if (limit) filters.limit = limit;

    const result = await userManagementService.getAllUsers(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/users - Create new user (admin only)
 */
export const POST = withAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const currentUserId = request.user?.uid;
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Current user ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, displayName, role, department, phoneNumber } = body;

    // Validate required fields
    if (!email || !password || !displayName || !role) {
      return NextResponse.json(
        { error: 'Email, password, display name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'manager', 'employee'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Create user
    const newUser = await userManagementService.createUser(
      {
        email,
        password,
        displayName,
        role,
        department,
        phoneNumber,
      },
      currentUserId
    );

    return NextResponse.json({
      success: true,
      data: {
        uid: newUser.uid,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
});