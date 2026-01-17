'use client';

import React, { ReactNode } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { UserRole } from '@/types/auth.types';

interface PermissionGuardProps {
  children: ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have ALL permissions/roles
  showFallback?: boolean; // If false, renders nothing when unauthorized
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  roles,
  permissions,
  fallback = null,
  requireAll = false,
  showFallback = true,
}) => {
  const { hasRole, hasPermission, loading } = useAuthEnhanced();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  let hasAccess = true;

  // Check role-based access
  if (roles && roles.length > 0) {
    if (requireAll) {
      // User must have ALL specified roles (unlikely use case)
      hasAccess = roles.every(role => hasRole([role]));
    } else {
      // User must have at least ONE of the specified roles
      hasAccess = hasRole(roles);
    }
  }

  // Check permission-based access (only if role check passed)
  if (hasAccess && permissions && permissions.length > 0) {
    if (requireAll) {
      // User must have ALL specified permissions
      hasAccess = permissions.every(permission => hasPermission(permission));
    } else {
      // User must have at least ONE of the specified permissions
      hasAccess = permissions.some(permission => hasPermission(permission));
    }
  }

  // Render children if user has access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Render fallback or nothing if user doesn't have access
  return showFallback ? <>{fallback}</> : null;
};

// Specific permission guards for common use cases
export const AdminGuard: React.FC<{ 
  children: ReactNode; 
  fallback?: ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = true }) => (
  <PermissionGuard 
    roles={['admin']} 
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const ManagerGuard: React.FC<{ 
  children: ReactNode; 
  fallback?: ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = true }) => (
  <PermissionGuard 
    roles={['admin', 'manager']} 
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const UserManagementGuard: React.FC<{ 
  children: ReactNode; 
  fallback?: ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = true }) => (
  <PermissionGuard 
    permissions={['users.manage']} 
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const ReportsGuard: React.FC<{ 
  children: ReactNode; 
  fallback?: ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = true }) => (
  <PermissionGuard 
    permissions={['reports.view']} 
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const TaskManagementGuard: React.FC<{ 
  children: ReactNode; 
  fallback?: ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = true }) => (
  <PermissionGuard 
    permissions={['tasks.manage']} 
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

// Conditional rendering based on permissions
export const ConditionalRender: React.FC<{
  condition: 'admin' | 'manager' | 'employee' | string[];
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ condition, children, fallback }) => {
  if (typeof condition === 'string') {
    // Handle role-based conditions
    const roles: UserRole[] = condition === 'admin' ? ['admin'] 
      : condition === 'manager' ? ['admin', 'manager']
      : ['admin', 'manager', 'employee'];
    
    return (
      <PermissionGuard roles={roles} fallback={fallback}>
        {children}
      </PermissionGuard>
    );
  } else {
    // Handle permission-based conditions
    return (
      <PermissionGuard permissions={condition} fallback={fallback}>
        {children}
      </PermissionGuard>
    );
  }
};