import { useState, useEffect, useCallback } from 'react';
import { Employee } from '@/services/employee.service';

interface UseEmployeesOptions {
  initialFetch?: boolean;
}

interface UseEmployeesReturn {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
  createEmployee: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Omit<Employee, 'id'>>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  deactivateEmployee: (id: string) => Promise<void>;
  refreshEmployees: () => Promise<void>;
  searchEmployees: (query: string) => void;
  filterEmployees: (filters: { status?: string; department?: string }) => void;
}

/**
 * Custom hook for managing employees with CRUD operations and optimistic updates
 * Validates Requirements: 5.7, 5.8, 9.3, 9.4, 9.5
 */
export function useEmployees(options: UseEmployeesOptions = {}): UseEmployeesReturn {
  const { initialFetch = true } = options;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);

  /**
   * Fetch employees from API
   * Validates Requirements: 5.7, 5.8
   */
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await fetch(`/api/employees?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const result = await response.json();
      setEmployees(result.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, departmentFilter]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (initialFetch) {
      fetchEmployees();
    }
  }, [initialFetch, fetchEmployees]);

  /**
   * Create a new employee with optimistic update
   * Validates Requirements: 9.3
   */
  const createEmployee = useCallback(
    async (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticEmployee: Employee = {
        ...data,
        id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistic update - add employee immediately
      setEmployees((prev) => [optimisticEmployee, ...prev]);

      try {
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            hireDate: data.hireDate.toISOString(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create employee');
        }

        const newEmployee = await response.json();

        // Replace optimistic employee with real employee
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === tempId ? newEmployee : employee))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setEmployees((prev) => prev.filter((employee) => employee.id !== tempId));
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Update an existing employee with optimistic update
   */
  const updateEmployee = useCallback(
    async (id: string, data: Partial<Omit<Employee, 'id'>>) => {
      // Store original employee for rollback
      const originalEmployee = employees.find((e) => e.id === id);
      if (!originalEmployee) {
        throw new Error('Employee not found');
      }

      // Optimistic update - update employee immediately
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === id
            ? { ...employee, ...data, updatedAt: new Date() }
            : employee
        )
      );

      try {
        const requestData = { ...data };
        // Convert date to ISO string if present
        if (data.hireDate) {
          requestData.hireDate = data.hireDate.toISOString() as any;
        }

        const response = await fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update employee');
        }

        const updatedEmployee = await response.json();

        // Replace optimistic update with server response
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === id ? updatedEmployee : employee))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === id ? originalEmployee : employee))
        );
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [employees]
  );

  /**
   * Delete an employee with optimistic update
   * Validates Requirements: 9.4
   */
  const deleteEmployee = useCallback(
    async (id: string) => {
      // Store original employee for rollback
      const originalEmployee = employees.find((e) => e.id === id);
      if (!originalEmployee) {
        throw new Error('Employee not found');
      }

      // Optimistic update - remove employee immediately
      setEmployees((prev) => prev.filter((employee) => employee.id !== id));

      try {
        const response = await fetch(`/api/employees/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete employee');
        }
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setEmployees((prev) => [...prev, originalEmployee]);
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [employees]
  );

  /**
   * Deactivate an employee with optimistic update
   * Validates Requirements: 5.10
   */
  const deactivateEmployee = useCallback(
    async (id: string) => {
      // Store original employee for rollback
      const originalEmployee = employees.find((e) => e.id === id);
      if (!originalEmployee) {
        throw new Error('Employee not found');
      }

      // Optimistic update - update status immediately
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === id
            ? { ...employee, status: 'terminated' as const, updatedAt: new Date() }
            : employee
        )
      );

      try {
        const response = await fetch(`/api/employees/${id}/deactivate`, {
          method: 'PATCH',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to deactivate employee');
        }

        const result = await response.json();

        // Replace optimistic update with server response
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === id ? result.employee : employee))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setEmployees((prev) =>
          prev.map((employee) => (employee.id === id ? originalEmployee : employee))
        );
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [employees]
  );

  /**
   * Refresh employees from server
   */
  const refreshEmployees = useCallback(async () => {
    await fetchEmployees();
  }, [fetchEmployees]);

  /**
   * Search employees
   * Validates Requirements: 5.8
   */
  const searchEmployees = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Filter employees
   * Validates Requirements: 5.7
   */
  const filterEmployees = useCallback((filters: { status?: string; department?: string }) => {
    setStatusFilter(filters.status);
    setDepartmentFilter(filters.department);
  }, []);

  return {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deactivateEmployee,
    refreshEmployees,
    searchEmployees,
    filterEmployees,
  };
}