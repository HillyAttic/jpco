import { NextRequest, NextResponse } from 'next/server';
import { employeeAdminService } from '@/services/employee-admin.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for employee update
const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  department: z.string().optional(),
  role: z.enum(['Manager', 'Admin', 'Employee']).optional(),
  status: z.enum(['active', 'on-leave', 'resigned']).optional(),
});

/**
 * GET /api/employees/[id]
 * Get a single employee by ID
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 5.1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }


    const { id } = await params;

    // Use Admin SDK service
    const employee = await employeeAdminService.getById(id);

    if (!employee) {
      return ErrorResponses.notFound('Employee');
    }

    return NextResponse.json(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/employees/[id]
 * Update an employee
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 5.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    const { id } = await params;
    const body = await request.json();

    // Extract password and currentPassword from body before validation
    const { password, currentPassword, ...dataToValidate } = body;

    // Validate request body
    const validationResult = updateEmployeeSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updateData = validationResult.data;

    // Check if employee exists (use Admin SDK)
    const existingEmployee = await employeeAdminService.getById(id);
    if (!existingEmployee) {
      return ErrorResponses.notFound('Employee');
    }

    // If password update requested, verify current password first
    if (password) {
      if (!currentPassword) {
        return ErrorResponses.badRequest('Current password is required to change password');
      }

      // Verify current password by attempting sign-in with Firebase Auth
      try {
        const { auth } = await import('@/lib/firebase');
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, existingEmployee.email, currentPassword);
      } catch (error: any) {
        console.error('[API] Current password verification failed:', error);
        return ErrorResponses.unauthorized('Current password is incorrect');
      }
    }

    // If updating employee ID, check for duplicates
    if (updateData.employeeId && updateData.employeeId !== existingEmployee.employeeId) {
      const existingByEmployeeId = await employeeAdminService.getByEmployeeId(updateData.employeeId);
      if (existingByEmployeeId && existingByEmployeeId.id !== id) {
        return ErrorResponses.conflict('Employee ID already exists');
      }
    }

    // Update employee using Admin SDK (password update requires separate handling)
    const updatedEmployee = await employeeAdminService.update(id, updateData, password);

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/employees/[id]
 * Delete an employee
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 5.2
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    // Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }


    const { id } = await params;

    // Check if employee exists (use Admin SDK)
    const existingEmployee = await employeeAdminService.getById(id);
    if (!existingEmployee) {
      return ErrorResponses.notFound('Employee');
    }

    // Delete employee using Admin SDK
    await employeeAdminService.delete(id);

    return NextResponse.json(
      { message: 'Employee deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}