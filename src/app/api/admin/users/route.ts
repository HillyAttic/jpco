import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/server-auth';
import { UserManagementService } from '@/services/user-management.service';

// POST /api/admin/users - Create a new user (admin only)
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.email || !data.displayName || !data.role || !data.password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, displayName, role, password' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'employee'];
    if (!validRoles.includes(data.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, manager, employee' },
        { status: 400 }
      );
    }

    // Validate password length
    if (data.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const userManagementService = UserManagementService.getInstance();

    // Get the authenticated user's UID from the request (added by withAdminAuth)
    const authUserUid = (req as any).authUser?.uid;
    if (!authUserUid) {
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      );
    }

    // Create the user
    const newUser = await userManagementService.createUser(
      {
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        password: data.password,
      },
      authUserUid
    );

    return NextResponse.json(
      { 
        success: true, 
        user: {
          uid: newUser.uid,
          email: newUser.email,
          displayName: data.displayName,
          role: data.role
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Check if it's a known error type
    if (error.message?.includes('email-already-in-use')) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});

// GET /api/admin/users - Get all users (admin only)
export const GET = withAdminAuth(async () => {
  try {
    const userManagementService = UserManagementService.getInstance();
    const result = await userManagementService.getAllUsers();
    
    return NextResponse.json({ users: result.users }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
});