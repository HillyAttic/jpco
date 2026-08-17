/**
 * Manager Access Helper
 * Shared utility to determine which employees a user can access
 * Used by payroll and relieving letter routes to scope data visibility
 */

import { adminDb } from '@/lib/firebase-admin';

/**
 * Get the list of employee IDs accessible by a user
 * - Admins: all active employees and managers
 * - Managers: only their assigned employees from manager-hierarchies
 * - Employees: empty array (should not have manager-level access)
 */
export async function getAccessibleEmployeeIds(
  userId: string,
  role: string
): Promise<string[]> {
  if (role === 'admin') {
    // Admins can see all active employees
    const usersSnapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['employee', 'manager'])
      .get();

    return usersSnapshot.docs.map((doc) => doc.id);
  }

  if (role === 'manager') {
    // Managers see only their assigned employees
    const hierarchySnapshot = await adminDb
      .collection('manager-hierarchies')
      .where('managerId', '==', userId)
      .limit(1)
      .get();

    if (hierarchySnapshot.empty) {
      return [];
    }

    const hierarchy = hierarchySnapshot.docs[0].data();
    return (hierarchy.employeeIds as string[]) || [];
  }

  // Employees have no subordinates
  return [];
}

/**
 * Check if a user (manager) has access to a specific employee
 */
export async function hasAccessToEmployee(
  userId: string,
  role: string,
  targetEmployeeId: string
): Promise<boolean> {
  if (role === 'admin') {
    return true;
  }

  if (role === 'manager') {
    const accessibleIds = await getAccessibleEmployeeIds(userId, role);
    return accessibleIds.includes(targetEmployeeId);
  }

  return false;
}
