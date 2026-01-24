import { NextRequest, NextResponse } from 'next/server';
import { employeeService } from '@/services/employee.service';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for employee update
const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/).optional(),
  role: z.enum(['Manager', 'Admin', 'Employee']).optional(),
  status: z.enum(['active', 'on-leave']).optional(),
});

/**
 * GET /api/employees/[id]
 * Get a single employee by ID
 * Validates Requirements: 5.1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;

    const employee = await employeeService.getById(id);

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
 * Validates Requirements: 5.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;
    const body = await request.json();

    // Extract password from body before validation
    const { password, ...dataToValidate } = body;

    // Validate request body
    const validationResult = updateEmployeeSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updateData = validationResult.data;

    // Check if employee exists
    const existingEmployee = await employeeService.getById(id);
    if (!existingEmployee) {
      return ErrorResponses.notFound('Employee');
    }

    // If updating employee ID, check for duplicates
    if (updateData.employeeId && updateData.employeeId !== existingEmployee.employeeId) {
      const existingByEmployeeId = await employeeService.getByEmployeeId(updateData.employeeId);
      if (existingByEmployeeId && existingByEmployeeId.id !== id) {
        return ErrorResponses.conflict('Employee ID already exists');
      }
    }

    // Update employee with optional password
    const updatedEmployee = await employeeService.update(id, updateData, password);

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/employees/[id]
 * Delete an employee
 * Validates Requirements: 5.2
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const { id } = await params;

    // Check if employee exists
    const existingEmployee = await employeeService.getById(id);
    if (!existingEmployee) {
      return ErrorResponses.notFound('Employee');
    }

    // Delete employee
    await employeeService.delete(id);

    return NextResponse.json(
      { message: 'Employee deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}