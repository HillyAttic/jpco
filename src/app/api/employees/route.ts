import { NextRequest, NextResponse } from 'next/server';
import { employeeService, Employee } from '@/services/employee.service';
import { employeeAdminService } from '@/services/employee-admin.service';
import { userManagementService } from '@/services/user-management.service';
import { UserRole } from '@/types/auth.types';
import { z } from 'zod';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

// Validation schema for employee creation
const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone format'),
  role: z.enum(['Manager', 'Admin', 'Employee']),
  status: z.enum(['active', 'on-leave']).default('active'),
  password: z.string().optional(),
});

/**
 * GET /api/employees
 * List all employees with optional pagination and filters
 * Uses Admin SDK to bypass Firestore security rules
 * Validates Requirements: 5.1, 5.7, 5.8
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API /api/employees] GET request received');
    
    // TODO: Add authentication check
    // const user = await verifyAuth(request);
    // if (!user) {
    //   return ErrorResponses.unauthorized();
    // }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '1000');

    console.log('[API /api/employees] Filters:', { status, search, limit });

    // Use Admin SDK service for server-side operations
    const employees = await employeeAdminService.getAll({
      status,
      search,
      limit,
    });

    console.log(`[API /api/employees] Returning ${employees.length} employees`);

    return NextResponse.json({
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    console.error('[API /api/employees] Error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/employees
 * Create a new employee
 * Validates Requirements: 5.2
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== EMPLOYEE CREATE REQUEST ===');
    console.log('Employee ID:', body.employeeId);
    console.log('Email:', body.email);

    // Validate request body
    const validationResult = createEmployeeSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.flatten());
      return ErrorResponses.badRequest(
        'Validation failed',
        validationResult.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const employeeData = validationResult.data;

    // Extract password from the data
    const { password, ...employeeWithoutPassword} = employeeData;

    // Create employee
    console.log('Calling employeeService.create...');
    const newEmployee = await employeeService.create(employeeWithoutPassword, password);
    console.log('Employee created successfully:', newEmployee.id);

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error('=== EMPLOYEE CREATE ERROR ===');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    
    // Handle Firebase auth errors
    if (error instanceof Error) {
      if (error.message.includes('auth/email-already-in-use') || error.message.includes('Email already exists')) {
        return ErrorResponses.conflict('Email already exists. This employee may have already been imported.');
      }
      
      if (error.message === 'Employee ID already exists') {
        return ErrorResponses.conflict('Employee ID already exists');
      }
    }

    return handleApiError(error);
  }
}