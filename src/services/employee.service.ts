/**
 * Employee Service
 * Handles all employee-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import { userManagementService } from './user-management.service';
import { UserRole } from '@/types/auth.types';

export interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Admin' | 'Employee';
  passwordHash?: string; // Hashed password, not plain text
  status: 'active' | 'on-leave' | 'terminated';
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
    search?: string;
    limit?: number;
  }): Promise<Employee[]> {
    try {
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
          ['name', 'email', 'role', 'employeeId'],
          filters.search,
          options
        );
      }

      return employees;
    } catch (error) {
      // Log detailed error information for debugging
      console.error('Error in employeeService.getAll:', {
        error,
        errorType: typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        filters,
      });
      
      // Return empty array if there's an error fetching employees
      // This allows the UI to continue functioning even if the fetch fails
      return [];
    }
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
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>,
    password?: string
  ): Promise<Employee> {
    // Check if employee ID already exists
    const existing = await this.getByEmployeeId(data.employeeId);
    if (existing) {
      throw new Error('Employee ID already exists');
    }

    // Simple password hashing (in production, use bcrypt or similar)
    const passwordHash = password ? btoa(password) : undefined;

    // Create employee in Firestore with password hash
    const employeeData = {
      ...data,
      ...(passwordHash && { passwordHash }),
    };
    
    const createdEmployee = await employeeFirebaseService.create(employeeData);
    
    // If password is provided, create Firebase Auth account
    if (password) {
      try {
        // Map employee role to UserRole
        const userRole = data.role === 'Admin' ? 'admin' : data.role === 'Manager' ? 'manager' : 'employee';
        
        // Create user in Firebase Auth
        await userManagementService.createUser(
          {
            email: data.email,
            password,
            displayName: data.name,
            role: userRole as UserRole,
            phoneNumber: data.phone,
          },
          'system' // createdBy system for employee accounts
        );
      } catch (error) {
        // If Firebase Auth creation fails, log the error
        console.error('Error creating Firebase Auth account for employee:', error);
        // Optionally re-throw the error to prevent partial creation
        // throw error;
      }
    }
    
    return createdEmployee;
  },

  /**
   * Update an employee
   */
  async update(
    id: string,
    data: Partial<Omit<Employee, 'id'>>,
    password?: string
  ): Promise<Employee> {
    // If password is provided, hash it and include in update
    if (password) {
      const passwordHash = btoa(password); // Simple hashing (use bcrypt in production)
      return employeeFirebaseService.update(id, { ...data, passwordHash });
    }
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
    // Department field no longer exists in Employee interface
    // This method is deprecated
    console.warn('getByDepartment is deprecated - department field removed from Employee');
    return [];
  },

  /**
   * Get employees by manager
   */
  async getByManager(managerId: string): Promise<Employee[]> {
    // Manager field no longer exists in Employee interface
    // This method is deprecated
    console.warn('getByManager is deprecated - managerId field removed from Employee');
    return [];
  },

  /**
   * Get employees by team
   */
  async getByTeam(teamId: string): Promise<Employee[]> {
    // Team field no longer exists in Employee interface
    // This method is deprecated
    console.warn('getByTeam is deprecated - teamIds field removed from Employee');
    return [];
  },

  /**
   * Get employee statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    onLeave: number;
    terminated: number;
  }> {
    const allEmployees = await employeeFirebaseService.getAll();

    return {
      total: allEmployees.length,
      active: allEmployees.filter((e) => e.status === 'active').length,
      onLeave: allEmployees.filter((e) => e.status === 'on-leave').length,
      terminated: allEmployees.filter((e) => e.status === 'terminated').length,
    };
  },

  /**
   * Search employees
   */
  async search(query: string): Promise<Employee[]> {
    return employeeFirebaseService.searchMultipleFields(
      ['name', 'email', 'role', 'employeeId'],
      query
    );
  },
};
