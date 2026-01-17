import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { roleManagementService } from '@/services/role-management.service';

/**
 * GET /api/auth/profile - Get current user profile
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    const userProfile = await roleManagementService.getUserProfile(userId);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/auth/profile - Update current user profile
 */
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user?.uid;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { displayName, department, phoneNumber } = body;

    // Validate input
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    // Update user profile
    await roleManagementService.updateUserProfile(userId, {
      displayName: displayName.trim(),
      department: department?.trim(),
      phoneNumber: phoneNumber?.trim(),
    });

    // Get updated profile
    const updatedProfile = await roleManagementService.getUserProfile(userId);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
});