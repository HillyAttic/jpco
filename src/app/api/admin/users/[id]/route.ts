import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { userManagementService } from '@/services/user-management.service';
import { roleManagementService } from '@/services/role-management.service';
import { UserRole } from '@/types/auth.types';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/users/[id] - Get specific user (admin only)
 */
export const GET = withAdminAuth(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const userId = params.id;
    const userProfile = await roleManagementService.getUserProfile(userId);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/users/[id] - Update specific user (admin only)
 */
export const PUT = withAdminAuth(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const currentUserId = request.user?.uid;
    const targetUserId = params.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Current user ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { displayName, role, department, phoneNumber, isActive } = body;

    // Update user profile
    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (department !== undefined) updates.department = department;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length > 0) {
      await userManagementService.updateUserProfile(
        targetUserId,
        updates,
        currentUserId
      );
    }

    // Update role if provided and different
    if (role) {
      const currentProfile = await roleManagementService.getUserProfile(targetUserId);
      if (currentProfile && currentProfile.role !== role) {
        await roleManagementService.assignRole(targetUserId, role, currentUserId);
      }
    }

    // Get updated profile
    const updatedProfile = await roleManagementService.getUserProfile(targetUserId);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/users/[id] - Delete specific user (admin only)
 */
export const DELETE = withAdminAuth(async (
  request: AuthenticatedRequest,
  { params }: RouteParams
) => {
  try {
    const currentUserId = request.user?.uid;
    const targetUserId = params.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Current user ID not found' },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await userManagementService.deleteUser(targetUserId, currentUserId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
});