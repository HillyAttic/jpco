import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, AdminRoute, ManagerRoute } from '@/components/Auth/ProtectedRoute';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth hook
jest.mock('@/hooks/use-auth-enhanced', () => ({
  useAuthEnhanced: jest.fn(),
}));

// Mock loading spinner
jest.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ size }: { size: string }) => <div data-testid="loading-spinner">{size}</div>,
}));

// Mock unauthorized page
jest.mock('@/components/Auth/UnauthorizedPage', () => ({
  UnauthorizedPage: () => <div data-testid="unauthorized-page">Unauthorized</div>,
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuthEnhanced = useAuthEnhanced as jest.MockedFunction<typeof useAuthEnhanced>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);
  });

  test('should show loading spinner while authentication is loading', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: true,
      isAuthenticated: () => false,
      hasRole: () => false,
      hasPermission: () => false,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('should redirect to sign-in when user is not authenticated', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => false,
      hasRole: () => false,
      hasPermission: () => false,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/auth/sign-in');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('should render content when user is authenticated and has no role restrictions', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: () => true,
      hasPermission: () => true,
    } as any);

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('should show unauthorized page when user lacks required role', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockReturnValue(false),
      hasPermission: () => true,
    } as any);

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  test('should show unauthorized page when user lacks required permission', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: () => true,
      hasPermission: jest.fn().mockReturnValue(false),
    } as any);

    render(
      <ProtectedRoute requiredPermissions={['users.manage']}>
        <div>User Management Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('User Management Content')).not.toBeInTheDocument();
  });

  test('should render content when user has required role', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockReturnValue(true),
      hasPermission: () => true,
    } as any);

    render(
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <div>Manager Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Manager Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  test('should render content when user has required permission', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: () => true,
      hasPermission: jest.fn().mockReturnValue(true),
    } as any);

    render(
      <ProtectedRoute requiredPermissions={['reports.view']}>
        <div>Reports Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Reports Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  test('should show custom fallback when provided', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockReturnValue(false),
      hasPermission: () => true,
    } as any);

    render(
      <ProtectedRoute 
        allowedRoles={['admin']} 
        fallback={<div>Custom Fallback</div>}
      >
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  test('should redirect to custom path when specified', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => false,
      hasRole: () => false,
      hasPermission: () => false,
    } as any);

    render(
      <ProtectedRoute redirectTo="/custom-login">
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/custom-login');
  });
});

describe('AdminRoute', () => {
  test('should only allow admin users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockImplementation((roles) => roles.includes('admin')),
      hasPermission: () => true,
    } as any);

    render(
      <AdminRoute>
        <div>Admin Only Content</div>
      </AdminRoute>
    );

    expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
  });

  test('should block non-admin users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockImplementation((roles) => !roles.includes('admin')),
      hasPermission: () => true,
    } as any);

    render(
      <AdminRoute>
        <div>Admin Only Content</div>
      </AdminRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
  });
});

describe('ManagerRoute', () => {
  test('should allow admin and manager users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockImplementation((roles) => 
        roles.includes('admin') || roles.includes('manager')
      ),
      hasPermission: () => true,
    } as any);

    render(
      <ManagerRoute>
        <div>Manager+ Content</div>
      </ManagerRoute>
    );

    expect(screen.getByText('Manager+ Content')).toBeInTheDocument();
  });

  test('should block employee users', () => {
    mockUseAuthEnhanced.mockReturnValue({
      loading: false,
      isAuthenticated: () => true,
      hasRole: jest.fn().mockImplementation((roles) => 
        !roles.includes('admin') && !roles.includes('manager')
      ),
      hasPermission: () => true,
    } as any);

    render(
      <ManagerRoute>
        <div>Manager+ Content</div>
      </ManagerRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Manager+ Content')).not.toBeInTheDocument();
  });
});