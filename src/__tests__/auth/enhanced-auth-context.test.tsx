import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { EnhancedAuthProvider, useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { UserRole } from '@/types/auth.types';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
    onIdTokenChanged: jest.fn(),
  },
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  onIdTokenChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('@/services/role-management.service', () => ({
  roleManagementService: {
    getUserProfile: jest.fn(),
    createUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
  },
}));

// Test component to access auth context
const TestComponent: React.FC = () => {
  const auth = useEnhancedAuth();
  
  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{auth.user ? auth.user.email : 'no user'}</div>
      <div data-testid="role">{auth.claims?.role || 'no role'}</div>
      <div data-testid="is-admin">{auth.isAdmin ? 'admin' : 'not admin'}</div>
      <div data-testid="is-manager">{auth.isManager ? 'manager' : 'not manager'}</div>
      <div data-testid="is-employee">{auth.isEmployee ? 'employee' : 'not employee'}</div>
    </div>
  );
};

describe('EnhancedAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should provide initial loading state', () => {
    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Don't call callback immediately to simulate loading
      return jest.fn(); // unsubscribe function
    });

    render(
      <EnhancedAuthProvider>
        <TestComponent />
      </EnhancedAuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    expect(screen.getByTestId('user')).toHaveTextContent('no user');
  });

  test('should handle authenticated user with admin role', async () => {
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
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    };

    const mockUserProfile = {
      uid: 'admin123',
      email: 'admin@example.com',
      role: 'admin' as UserRole,
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
        <TestComponent />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('admin@example.com');
    expect(screen.getByTestId('role')).toHaveTextContent('admin');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('admin');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('manager'); // Admin inherits manager
    expect(screen.getByTestId('is-employee')).toHaveTextContent('employee'); // Admin inherits employee
  });

  test('should handle authenticated user with manager role', async () => {
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
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    };

    const mockUserProfile = {
      uid: 'manager123',
      email: 'manager@example.com',
      role: 'manager' as UserRole,
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
        <TestComponent />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('manager@example.com');
    expect(screen.getByTestId('role')).toHaveTextContent('manager');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('not admin');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('manager');
    expect(screen.getByTestId('is-employee')).toHaveTextContent('employee'); // Manager inherits employee
  });

  test('should handle authenticated user with employee role', async () => {
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
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    };

    const mockUserProfile = {
      uid: 'employee123',
      email: 'employee@example.com',
      role: 'employee' as UserRole,
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
        <TestComponent />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('employee@example.com');
    expect(screen.getByTestId('role')).toHaveTextContent('employee');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('not admin');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('not manager');
    expect(screen.getByTestId('is-employee')).toHaveTextContent('employee');
  });

  test('should handle unauthenticated user', async () => {
    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;

    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return jest.fn();
    });

    render(
      <EnhancedAuthProvider>
        <TestComponent />
      </EnhancedAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no user');
    expect(screen.getByTestId('role')).toHaveTextContent('no role');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('not admin');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('not manager');
    expect(screen.getByTestId('is-employee')).toHaveTextContent('not employee');
  });
});