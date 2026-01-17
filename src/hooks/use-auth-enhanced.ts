import { useCallback } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { UserRole } from '@/types/auth.types';

/**
 * Enhanced authentication hook with role-based utilities
 */
export const useAuthEnhanced = () => {
  const auth = useEnhancedAuth();

  /**
   * Check if user can access admin features
   */
  const canAccessAdmin = useCallback((): boolean => {
    return auth.isAdmin;
  }, [auth.isAdmin]);

  /**
   * Check if user can manage users
   */
  const canManageUsers = useCallback((): boolean => {
    return auth.hasPermission('users.manage');
  }, [auth]);

  /**
   * Check if user can assign roles
   */
  const canAssignRoles = useCallback((): boolean => {
    return auth.hasPermission('roles.assign');
  }, [auth]);

  /**
   * Check if user can view reports
   */
  const canViewReports = useCallback((): boolean => {
    return auth.hasPermission('reports.view');
  }, [auth]);

  /**
   * Check if user can manage tasks
   */
  const canManageTasks = useCallback((): boolean => {
    return auth.hasPermission('tasks.manage');
  }, [auth]);

  /**
   * Check if user can manage teams
   */
  const canManageTeams = useCallback((): boolean => {
    return auth.hasPermission('teams.manage');
  }, [auth]);

  /**
   * Check if user can manage attendance
   */
  const canManageAttendance = useCallback((): boolean => {
    return auth.hasPermission('attendance.manage');
  }, [auth]);

  /**
   * Check if user can view attendance
   */
  const canViewAttendance = useCallback((): boolean => {
    return auth.hasPermission('attendance.view') || auth.hasPermission('attendance.manage');
  }, [auth]);

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    return auth.hasRole(roles);
  }, [auth]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => auth.hasPermission(permission));
  }, [auth]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => auth.hasPermission(permission));
  }, [auth]);

  /**
   * Get user's role display name
   */
  const getRoleDisplayName = useCallback((): string => {
    if (!auth.claims) return 'Unknown';
    
    switch (auth.claims.role) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      case 'employee':
        return 'Employee';
      default:
        return 'Unknown';
    }
  }, [auth.claims]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback((): boolean => {
    return !!auth.user && !auth.loading;
  }, [auth.user, auth.loading]);

  /**
   * Check if user profile is complete
   */
  const isProfileComplete = useCallback((): boolean => {
    if (!auth.userProfile) return false;
    
    return !!(
      auth.userProfile.displayName &&
      auth.userProfile.email &&
      auth.userProfile.role
    );
  }, [auth.userProfile]);

  /**
   * Get user initials for avatar
   */
  const getUserInitials = useCallback((): string => {
    if (!auth.userProfile?.displayName) return 'U';
    
    const names = auth.userProfile.displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }, [auth.userProfile]);

  /**
   * Check if current user can edit another user
   */
  const canEditUser = useCallback((targetUserId: string): boolean => {
    // Admins can edit anyone
    if (auth.isAdmin) return true;
    
    // Users can edit themselves
    if (auth.user?.uid === targetUserId) return true;
    
    return false;
  }, [auth.isAdmin, auth.user]);

  /**
   * Check if current user can delete another user
   */
  const canDeleteUser = useCallback((targetUserId: string): boolean => {
    // Only admins can delete users
    if (!auth.isAdmin) return false;
    
    // Users cannot delete themselves
    if (auth.user?.uid === targetUserId) return false;
    
    return true;
  }, [auth.isAdmin, auth.user]);

  return {
    ...auth,
    canAccessAdmin,
    canManageUsers,
    canAssignRoles,
    canViewReports,
    canManageTasks,
    canManageTeams,
    canManageAttendance,
    canViewAttendance,
    hasAnyRole,
    hasAllPermissions,
    hasAnyPermission,
    getRoleDisplayName,
    isAuthenticated,
    isProfileComplete,
    getUserInitials,
    canEditUser,
    canDeleteUser,
  };
};