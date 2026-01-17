/**
 * Employee Service
 * Handles all employee-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';

export interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hireDate: Date;
  avatarUrl?: string;
  status: 'active' | 'on-leave' | 'terminated';
  managerId?: string;
  teamIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the Firebase service instance for employees
const employeeFirebaseService = createFirebaseService<Employee>('employees');

/**
 * Employee Service API
 */
export const employeeService = {
  /**
   * Get all employees with optional filters
   */
  async getAll(filters?: {
    status?: string;
    department?: string;
    search?: string;
    limit?: number;
  }): Promise<Employee[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add status filter
    if (filters?.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add department filter
    if (filters?.department) {
      options.filters!.push({
        field: 'department',
        operator: '==',
        value: filters.department,
      });
    }

    // Add pagination
    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'createdAt';
    options.orderDirection = 'desc';

    let employees = await employeeFirebaseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      employees = await employeeFirebaseService.searchMultipleFields(
        ['name', 'email', 'position', 'employeeId'],
        filters.search,
        options
      );
    }

    return employees;
  },

  /**
   * Get an employee by ID
   */
  async getById(id: string): Promise<Employee | null> {
    return employeeFirebaseService.getById(id);
  },

  /**
   * Get an employee by employee ID
   */
  async getByEmployeeId(employeeId: string): Promise<Employee | null> {
    const employees = await employeeFirebaseService.getAll({
      filters: [
        {
          field: 'employeeId',
          operator: '==',
          value: employeeId,
        },
      ],
    });

    return employees.length > 0 ? employees[0] : null;
  },

  /**
   * Create a new employee
   */
  async create(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Employee> {
    // Check if employee ID already exists
    const existing = await this.getByEmployeeId(data.employeeId);
    if (existing) {
      throw new Error('Employee ID already exists');
    }

    return employeeFirebaseService.create(data);
  },

  /**
   * Update an employee
   */
  async update(
    id: string,
    data: Partial<Omit<Employee, 'id'>>
  ): Promise<Employee> {
    return employeeFirebaseService.update(id, data);
  },

  /**
   * Delete an employee
   */
  async delete(id: string): Promise<void> {
    return employeeFirebaseService.delete(id);
  },

  /**
   * Deactivate an employee (soft delete)
   */
  async deactivate(id: string): Promise<Employee> {
    return employeeFirebaseService.update(id, { status: 'terminated' });
  },

  /**
   * Reactivate an employee
   */
  async reactivate(id: string): Promise<Employee> {
    return employeeFirebaseService.update(id, { status: 'active' });
  },

  /**
   * Get employees by department
   */
  async getByDepartment(department: string): Promise<Employee[]> {
    return employeeFirebaseService.getAll({
      filters: [
        {
          field: 'department',
          operator: '==',
          value: department,
        },
      ],
    });
  },

  /**
   * Get employees by manager
   */
  async getByManager(managerId: string): Promise<Employee[]> {
    return employeeFirebaseService.getAll({
      filters: [
        {
          field: 'managerId',
          operator: '==',
          value: managerId,
        },
      ],
    });
  },

  /**
   * Get employees by team
   */
  async getByTeam(teamId: string): Promise<Employee[]> {
    const allEmployees = await employeeFirebaseService.getAll();
    return allEmployees.filter((emp) => emp.teamIds.includes(teamId));
  },

  /**
   * Get employee statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    onLeave: number;
    terminated: number;
    departmentDistribution: Record<string, number>;
  }> {
    const allEmployees = await employeeFirebaseService.getAll();

    const departmentDistribution: Record<string, number> = {};
    allEmployees.forEach((emp) => {
      if (emp.department) {
        departmentDistribution[emp.department] =
          (departmentDistribution[emp.department] || 0) + 1;
      }
    });

    return {
      total: allEmployees.length,
      active: allEmployees.filter((e) => e.status === 'active').length,
      onLeave: allEmployees.filter((e) => e.status === 'on-leave').length,
      terminated: allEmployees.filter((e) => e.status === 'terminated').length,
      departmentDistribution,
    };
  },

  /**
   * Search employees
   */
  async search(query: string): Promise<Employee[]> {
    return employeeFirebaseService.searchMultipleFields(
      ['name', 'email', 'position', 'employeeId'],
      query
    );
  },
};
