import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  PermissionGuard, 
  AdminGuard, 
  ManagerGuard, 
  UserManagementGuard,
  ConditionalRender 
} from '@/components/Auth/PermissionGuard';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';

// Mock auth hook
jest.mock('@/hooks/use-auth-enhanced', () => ({
  useAuthEnhanced: jest.fn(),
}));

const mockUseAuthEnhanced = useAuthEnhanced as jest.MockedFunction<typeof useAuthEnhanced>;

describe('PermissionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render nothing while loading', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: true,
      hasRole: () => false,
      hasPermission: () => false,
    } as any);

    render(
      <PermissionGuard roles={['admin']}>
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('should render children when user has required role', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockReturnValue(true),
      hasPermission: () => true,
    } as any);

    render(
      <PermissionGuard roles={['admin']}>
        <div>Admin Content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  test('should not render children when user lacks required role', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockReturnValue(false),
      hasPermission: () => true,
    } as any);

    render(
      <PermissionGuard roles={['admin']}>
        <div>Admin Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('should render children when user has required permission', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn().mockReturnValue(true),
    } as any);

    render(
      <PermissionGuard permissions={['users.manage']}>
        <div>User Management Content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('User Management Content')).toBeInTheDocument();
  });

  test('should not render children when user lacks required permission', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn().mockReturnValue(false),
    } as any);

    render(
      <PermissionGuard permissions={['users.manage']}>
        <div>User Management Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('User Management Content')).not.toBeInTheDocument();
  });

  test('should render fallback when user lacks access and showFallback is true', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockReturnValue(false),
      hasPermission: () => true,
    } as any);

    render(
      <PermissionGuard 
        roles={['admin']} 
        fallback={<div>Access Denied</div>}
        showFallback={true}
      >
        <div>Admin Content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('should render nothing when user lacks access and showFallback is false', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockReturnValue(false),
      hasPermission: () => true,
    } as any);

    render(
      <PermissionGuard 
        roles={['admin']} 
        fallback={<div>Access Denied</div>}
        showFallback={false}
      >
        <div>Admin Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('should require ALL permissions when requireAll is true', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn()
        .mockReturnValueOnce(true)  // First permission
        .mockReturnValueOnce(false), // Second permission
    } as any);

    render(
      <PermissionGuard 
        permissions={['users.manage', 'roles.assign']} 
        requireAll={true}
      >
        <div>Full Admin Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('Full Admin Content')).not.toBeInTheDocument();
  });

  test('should require ANY permission when requireAll is false', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn()
        .mockReturnValueOnce(true)  // First permission
        .mockReturnValueOnce(false), // Second permission
    } as any);

    render(
      <PermissionGuard 
        permissions={['users.manage', 'roles.assign']} 
        requireAll={false}
      >
        <div>Partial Admin Content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Partial Admin Content')).toBeInTheDocument();
  });
});

describe('AdminGuard', () => {
  test('should render content for admin users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockImplementation((roles) => roles.includes('admin')),
      hasPermission: () => true,
    } as any);

    render(
      <AdminGuard>
        <div>Admin Only</div>
      </AdminGuard>
    );

    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });

  test('should not render content for non-admin users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockImplementation((roles) => !roles.includes('admin')),
      hasPermission: () => true,
    } as any);

    render(
      <AdminGuard>
        <div>Admin Only</div>
      </AdminGuard>
    );

    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });
});

describe('ManagerGuard', () => {
  test('should render content for admin and manager users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockImplementation((roles) => 
        roles.includes('admin') || roles.includes('manager')
      ),
      hasPermission: () => true,
    } as any);

    render(
      <ManagerGuard>
        <div>Manager+ Content</div>
      </ManagerGuard>
    );

    expect(screen.getByText('Manager+ Content')).toBeInTheDocument();
  });

  test('should not render content for employee users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockImplementation((roles) => 
        !roles.includes('admin') && !roles.includes('manager')
      ),
      hasPermission: () => true,
    } as any);

    render(
      <ManagerGuard>
        <div>Manager+ Content</div>
      </ManagerGuard>
    );

    expect(screen.queryByText('Manager+ Content')).not.toBeInTheDocument();
  });
});

describe('UserManagementGuard', () => {
  test('should render content when user has users.manage permission', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn().mockImplementation((permission) => 
        permission === 'users.manage'
      ),
    } as any);

    render(
      <UserManagementGuard>
        <div>User Management</div>
      </UserManagementGuard>
    );

    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  test('should not render content when user lacks users.manage permission', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn().mockImplementation((permission) => 
        permission !== 'users.manage'
      ),
    } as any);

    render(
      <UserManagementGuard>
        <div>User Management</div>
      </UserManagementGuard>
    );

    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });
});

describe('ConditionalRender', () => {
  test('should render content for admin condition', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockImplementation((roles) => roles.includes('admin')),
      hasPermission: () => true,
    } as any);

    render(
      <ConditionalRender condition="admin">
        <div>Admin Content</div>
      </ConditionalRender>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  test('should render content for manager condition with manager role', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: jest.fn().mockImplementation((roles) => 
        roles.includes('manager') || roles.includes('admin')
      ),
      hasPermission: () => true,
    } as any);

    render(
      <ConditionalRender condition="manager">
        <div>Manager Content</div>
      </ConditionalRender>
    );

    expect(screen.getByText('Manager Content')).toBeInTheDocument();
  });

  test('should render content for permission-based condition', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      hasRole: () => true,
      hasPermission: jest.fn().mockImplementation((permission) => 
        ['reports.view', 'tasks.manage'].includes(permission)
      ),
    } as any);

    render(
      <ConditionalRender condition={['reports.view', 'tasks.manage']}>
        <div>Permission Content</div>
      </ConditionalRender>
    );

    expect(screen.getByText('Permission Content')).toBeInTheDocument();
  });
});