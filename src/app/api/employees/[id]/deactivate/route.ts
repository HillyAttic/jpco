import { NextRequest, NextResponse } from 'next/server';
import { employeeAdminService } from '@/services/employee-admin.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * PATCH /api/employees/[id]/deactivate
 * Deactivate an employee (soft delete)
 * Validates Requirements: 5.10
 */
export async function PATCH(
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

    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;

    // Check if employee exists (use Admin SDK)
    const existingEmployee = await employeeAdminService.getById(id);
    if (!existingEmployee) {
      return ErrorResponses.notFound('Employee');
    }

    // Check if employee is already on leave (deactivated)
    if (existingEmployee.status === 'on-leave') {
      return ErrorResponses.badRequest('Employee is already deactivated');
    }

    // Deactivate employee using Admin SDK
    const deactivatedEmployee = await employeeAdminService.deactivate(id);

    return NextResponse.json({
      message: 'Employee deactivated successfully',
      employee: deactivatedEmployee
    });
  } catch (error) {
    return handleApiError(error);
  }
}