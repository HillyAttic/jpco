import { NextRequest, NextResponse } from 'next/server';
import { UserRole, CustomClaims } from '@/types/auth.types';
import admin from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Server-side authentication utilities for API routes
 * Uses Firebase Admin SDK for secure token verification
 */

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email: string | null;
    claims: CustomClaims;
  };
}

/**
 * Extract and verify Firebase ID token from request headers using Firebase Admin SDK
 */
export async function verifyAuthToken(request: NextRequest): Promise<{
  success: boolean;
  user?: {
    uid: string;
    email: string | null;
    claims: CustomClaims;
  };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return {
        success: false,
        error: 'Missing ID token',
      };
    }

    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    
    if (!decodedToken || !decodedToken.uid) {
      return {
        success: false,
        error: 'Invalid token',
      };
    }

    // Get user profile from Firestore to retrieve role and permissions
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    const userData = userDoc.data();
    const role = (decodedToken.role as UserRole) || userData?.role || 'employee';
    
    // Build custom claims
    const claims: CustomClaims = {
      role,
      permissions: userData?.permissions || [],
      isAdmin: role === 'admin',
      createdAt: userData?.createdAt || new Date().toISOString(),
      lastRoleUpdate: userData?.lastRoleUpdate || new Date().toISOString(),
    };

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        claims,
      },
    };
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    // Provide specific error messages for common issues
    if (error.code === 'auth/id-token-expired') {
      return {
        success: false,
        error: 'Token expired. Please sign in again.',
      };
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return {
        success: false,
        error: 'Token revoked. Please sign in again.',
      };
    }
    
    if (error.code === 'auth/argument-error') {
      return {
        success: false,
        error: 'Invalid token format',
      };
    }
    
    return {
      success: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Middleware to protect API routes with authentication
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Add user info to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = authResult.user;

    return handler(authenticatedRequest);
  };
}

/**
 * Middleware to protect API routes with role-based access control
 */
export function withRoleAuth(
  allowedRoles: UserRole[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const userRole = request.user?.claims.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request);
  });
}

/**
 * Middleware to protect API routes with permission-based access control
 */
export function withPermissionAuth(
  requiredPermissions: string[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const userPermissions = request.user?.claims.permissions || [];
    
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request);
  });
}

/**
 * Admin-only API route protection
 */
export function withAdminAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRoleAuth(['admin'], handler);
}

/**
 * Manager+ API route protection (admin and manager roles)
 */
export function withManagerAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRoleAuth(['admin', 'manager'], handler);
}

/**
 * Extract user ID from authenticated request
 */
export function getUserId(request: AuthenticatedRequest): string | null {
  return request.user?.uid || null;
}

/**
 * Extract user role from authenticated request
 */
export function getUserRole(request: AuthenticatedRequest): UserRole | null {
  return request.user?.claims.role || null;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  request: AuthenticatedRequest,
  permission: string
): boolean {
  const userPermissions = request.user?.claims.permissions || [];
  return userPermissions.includes(permission);
}

/**
 * Check if user has specific role
 */
export function hasRole(
  request: AuthenticatedRequest,
  role: UserRole | UserRole[]
): boolean {
  const userRole = request.user?.claims.role;
  if (!userRole) return false;
  
  if (Array.isArray(role)) {
    return role.includes(userRole);
  }
  
  return userRole === role;
}

/**
 * Create error response for authentication failures
 */
export function createAuthErrorResponse(
  message: string,
  status: number = 401
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Create error response for authorization failures
 */
export function createAuthzErrorResponse(
  message: string = 'Insufficient permissions'
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}