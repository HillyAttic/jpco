/**
 * Integration tests for the complete role-based authentication system
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedAuthProvider } from '@/contexts/enhanced-auth.context';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { PermissionGuard } from '@/components/Auth/PermissionGuard';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  onIdTokenChanged: jest.fn(),
}));

jest.mock('@/services/role-management.service', () => ({
  roleManagementService: {
    getUserProfile: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Test component that uses authentication
const TestApp: React.FC = () => {
  const { user, isAdmin, isManager, canManageUsers } = useAuthEnhanced();

  return (
    <div>
      <div data-testid="auth-status">
        {user ? `Authenticated: ${user.email}` : 'Not authenticated'}
      </div>
      
      <ProtectedRoute allowedRoles={['admin']}>
        <div data-testid="admin-content">Admin Dashboard</div>
      </ProtectedRoute>

      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <div data-testid="manager-content">Manager Dashboard</div>
      </ProtectedRoute>

      <PermissionGuard permissions={['users.manage']}>
        <div data-testid="user-management">User Management</div>
      </PermissionGuard>

      <div data-testid="role-info">
        Admin: {isAdmin ? 'Yes' : 'No'}, 
        Manager: {isManager ? 'Yes' : 'No'}, 
        Can Manage Users: {canManageUsers() ? 'Yes' : 'No'}
      </div>
    </div>
  );
};

describe('Authentication System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should integrate all authentication components for admin user', async () => {
    const mockUser = {
      uid: 'admin123',
      email: 'admin@example.com',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {
          role: 'admin',
          permissions: ['users.manage', 'roles.assign'],
          isAdmin: true,
        },
      }),
      getIdToken: jest.fn(),
    };

    const mockUserProfile = {
      uid: 'admin123',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['users.manage', 'roles.assign'],
      isActive: true,
    };

    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;
    const mockGetUserProfile = require('@/services/role-management.service').roleManagementService.getUserProfile;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return jest.fn();
    });

    mockGetUserProfile.mockResolvedValue(mockUserProfile);

    render(
      <EnhancedAuthProvider>
        <TestApp />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: admin@example.com');
    });

    // Admin should see all content
    expect(screen.getByTestId('admin-content')).toHaveTextContent('Admin Dashboard');
    expect(screen.getByTestId('manager-content')).toHaveTextContent('Manager Dashboard');
    expect(screen.getByTestId('user-management')).toHaveTextContent('User Management');
    expect(screen.getByTestId('role-info')).toHaveTextContent('Admin: Yes, Manager: Yes, Can Manage Users: Yes');
  });

  test('should integrate all authentication components for manager user', async () => {
    const mockUser = {
      uid: 'manager123',
      email: 'manager@example.com',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {
          role: 'manager',
          permissions: ['reports.view', 'tasks.manage'],
          isAdmin: false,
        },
      }),
      getIdToken: jest.fn(),
    };

    const mockUserProfile = {
      uid: 'manager123',
      email: 'manager@example.com',
      role: 'manager',
      permissions: ['reports.view', 'tasks.manage'],
      isActive: true,
    };

    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;
    const mockGetUserProfile = require('@/services/role-management.service').roleManagementService.getUserProfile;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return jest.fn();
    });

    mockGetUserProfile.mockResolvedValue(mockUserProfile);

    render(
      <EnhancedAuthProvider>
        <TestApp />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: manager@example.com');
    });

    // Manager should see manager content but not admin content
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('manager-content')).toHaveTextContent('Manager Dashboard');
    expect(screen.queryByTestId('user-management')).not.toBeInTheDocument(); // No users.manage permission
    expect(screen.getByTestId('role-info')).toHaveTextContent('Admin: No, Manager: Yes, Can Manage Users: No');
  });

  test('should integrate all authentication components for employee user', async () => {
    const mockUser = {
      uid: 'employee123',
      email: 'employee@example.com',
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: {
          role: 'employee',
          permissions: ['tasks.view', 'tasks.update'],
          isAdmin: false,
        },
      }),
      getIdToken: jest.fn(),
    };

    const mockUserProfile = {
      uid: 'employee123',
      email: 'employee@example.com',
      role: 'employee',
      permissions: ['tasks.view', 'tasks.update'],
      isActive: true,
    };

    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;
    const mockGetUserProfile = require('@/services/role-management.service').roleManagementService.getUserProfile;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return jest.fn();
    });

    mockGetUserProfile.mockResolvedValue(mockUserProfile);

    render(
      <EnhancedAuthProvider>
        <TestApp />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated: employee@example.com');
    });

    // Employee should see minimal content
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manager-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-management')).not.toBeInTheDocument();
    expect(screen.getByTestId('role-info')).toHaveTextContent('Admin: No, Manager: No, Can Manage Users: No');
  });

  test('should handle unauthenticated user correctly', async () => {
    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return jest.fn();
    });

    render(
      <EnhancedAuthProvider>
        <TestApp />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });

    // Unauthenticated user should see no protected content
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manager-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-management')).not.toBeInTheDocument();
    expect(screen.getByTestId('role-info')).toHaveTextContent('Admin: No, Manager: No, Can Manage Users: No');
  });
});