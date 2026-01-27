import { NextRequest, NextResponse } from 'next/server';
import { employeeService } from '@/services/employee.service';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';

/**
 * GET /api/users/names
 * Get a map of user IDs to display names
 * Used for displaying user names in task lists and other components
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ErrorResponses.unauthorized();
    }

    // Fetch all employees
    const employees = await employeeService.getAll();
    
    // Create a map of user ID to name
    const nameMap: Record<string, string> = {};
    employees.forEach(emp => {
      if (emp.id) {
        nameMap[emp.id] = emp.name || emp.email || 'Unknown User';
      }
      // Also map by employeeId in case tasks reference that
      if (emp.employeeId && emp.employeeId !== emp.id) {
        nameMap[emp.employeeId] = emp.name || emp.email || 'Unknown User';
      }
    });
    
    return NextResponse.json(nameMap, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
