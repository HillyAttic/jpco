/**
 * Manager-Employee Hierarchy Service
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import { ManagerHierarchy, ManagerHierarchyFilters, EmployeeInfo } from '@/types/manager-hierarchy.types';
import { employeeService } from './employee.service';

const hierarchyFirebaseService = createFirebaseService<ManagerHierarchy>('manager-hierarchies');

export const managerHierarchyService = {
  /**
   * Get all manager hierarchies
   */
  async getAll(filters?: ManagerHierarchyFilters): Promise<ManagerHierarchy[]> {
    const options: QueryOptions = {
      filters: [],
      orderByField: 'createdAt',
      orderDirection: 'desc',
    };

    if (filters?.managerId) {
      options.filters!.push({
        field: 'managerId',
        operator: '==',
        value: filters.managerId,
      });
    }

    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    let hierarchies = await hierarchyFirebaseService.getAll(options);

    // Client-side search
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      hierarchies = hierarchies.filter(h =>
        h.managerName.toLowerCase().includes(searchLower) ||
        h.managerEmail.toLowerCase().includes(searchLower)
      );
    }

    return hierarchies;
  },

  /**
   * Get hierarchy by manager ID
   */
  async getByManagerId(managerId: string): Promise<ManagerHierarchy | null> {
    const hierarchies = await this.getAll({ managerId });
    return hierarchies.length > 0 ? hierarchies[0] : null;
  },

  /**
   * Create or update manager hierarchy
   */
  async createOrUpdate(
    managerId: string,
    managerName: string,
    managerEmail: string,
    employeeIds: string[],
    createdBy?: string
  ): Promise<ManagerHierarchy> {
    // Get employee details
    const allEmployees = await employeeService.getAll();
    const employees = employeeIds
      .map(id => {
        const emp = allEmployees.find(e => e.id === id);
        if (!emp) return null;
        const info: EmployeeInfo = {
          id: emp.id!,
          name: emp.name,
          email: emp.email,
          department: emp.role,
        };
        return info;
      })
      .filter((e): e is EmployeeInfo => e !== null);

    // Check if hierarchy exists
    const existing = await this.getByManagerId(managerId);

    if (existing && existing.id) {
      // Update existing
      await hierarchyFirebaseService.update(existing.id, {
        employeeIds,
        employees,
      });
      return { ...existing, employeeIds, employees };
    } else {
      // Create new
      return await hierarchyFirebaseService.create({
        managerId,
        managerName,
        managerEmail,
        employeeIds,
        employees,
        createdBy,
      });
    }
  },

  /**
   * Add employees to manager
   */
  async addEmployees(managerId: string, employeeIds: string[]): Promise<void> {
    const hierarchy = await this.getByManagerId(managerId);
    if (!hierarchy || !hierarchy.id) {
      throw new Error('Manager hierarchy not found');
    }

    const updatedEmployeeIds = [...new Set([...hierarchy.employeeIds, ...employeeIds])];
    
    // Get employee details
    const allEmployees = await employeeService.getAll();
    const employees = updatedEmployeeIds
      .map(id => {
        const emp = allEmployees.find(e => e.id === id);
        if (!emp) return null;
        const info: EmployeeInfo = {
          id: emp.id!,
          name: emp.name,
          email: emp.email,
          department: emp.role,
        };
        return info;
      })
      .filter((e): e is EmployeeInfo => e !== null);

    await hierarchyFirebaseService.update(hierarchy.id, {
      employeeIds: updatedEmployeeIds,
      employees,
    });
  },

  /**
   * Remove employees from manager
   */
  async removeEmployees(managerId: string, employeeIds: string[]): Promise<void> {
    const hierarchy = await this.getByManagerId(managerId);
    if (!hierarchy || !hierarchy.id) {
      throw new Error('Manager hierarchy not found');
    }

    const updatedEmployeeIds = hierarchy.employeeIds.filter(id => !employeeIds.includes(id));
    
    // Get employee details
    const allEmployees = await employeeService.getAll();
    const employees = updatedEmployeeIds
      .map(id => {
        const emp = allEmployees.find(e => e.id === id);
        if (!emp) return null;
        const info: EmployeeInfo = {
          id: emp.id!,
          name: emp.name,
          email: emp.email,
          department: emp.role,
        };
        return info;
      })
      .filter((e): e is EmployeeInfo => e !== null);

    await hierarchyFirebaseService.update(hierarchy.id, {
      employeeIds: updatedEmployeeIds,
      employees,
    });
  },

  /**
   * Check if manager can assign task to employee
   */
  async canAssignTask(managerId: string, employeeId: string): Promise<boolean> {
    const hierarchy = await this.getByManagerId(managerId);
    return hierarchy ? hierarchy.employeeIds.includes(employeeId) : false;
  },

  /**
   * Get employees under manager
   */
  async getManagerEmployees(managerId: string): Promise<EmployeeInfo[]> {
    const hierarchy = await this.getByManagerId(managerId);
    return hierarchy ? hierarchy.employees : [];
  },

  /**
   * Delete manager hierarchy
   */
  async delete(managerId: string): Promise<void> {
    const hierarchy = await this.getByManagerId(managerId);
    if (hierarchy && hierarchy.id) {
      await hierarchyFirebaseService.delete(hierarchy.id);
    }
  },
};
