'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Employee } from '@/services/employee.service';
import { useEmployees } from '@/hooks/use-employees';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { EmployeeModal } from '@/components/employees/EmployeeModal';
import { EmployeeStatsCard } from '@/components/employees/EmployeeStatsCard';
import { EmployeeFilter, EmployeeFilterState } from '@/components/employees/EmployeeFilter';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { Button } from '@/components/ui/button';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton, StatsGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { exportToCSV, generateTimestampedFilename } from '@/utils/csv-export';
import { PlusIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

// Form schema for employee data
const employeeFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone format'),
  position: z.string().min(1, 'Position is required').max(100),
  department: z.string().min(1, 'Department is required').max(100),
  hireDate: z.date(),
  avatar: z.instanceof(File).optional(),
  managerId: z.string().optional(),
  status: z.enum(['active', 'on-leave', 'terminated']),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

/**
 * Employees Page Component
 * Main page for employee management with CRUD operations, filtering, and statistics
 * Validates Requirements: 5.1, 5.2, 10.1, 10.2, 10.3, 10.4
 */
export default function EmployeesPage() {
  const {
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
  } = useEmployees();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<EmployeeFilterState>({
    status: 'all',
    department: 'all',
    search: '',
  });
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Get unique departments from employees for filter dropdown
  const availableDepartments = useMemo(() => {
    const departments = new Set(employees.map(emp => emp.department).filter(Boolean));
    return Array.from(departments).sort();
  }, [employees]);

  // Get potential managers (active employees only)
  const potentialManagers = useMemo(() => {
    return employees.filter(emp => emp.status === 'active');
  }, [employees]);

  // Filter employees based on current filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // Status filter
      if (filters.status !== 'all' && employee.status !== filters.status) {
        return false;
      }

      // Department filter
      if (filters.department !== 'all' && employee.department !== filters.department) {
        return false;
      }

      // Search filter (name, email, position, employee ID)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          employee.name.toLowerCase().includes(searchLower) ||
          employee.email.toLowerCase().includes(searchLower) ||
          employee.position.toLowerCase().includes(searchLower) ||
          employee.employeeId.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [employees, filters]);

  // Bulk selection state - Requirement 10.1
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useBulkSelection(filteredEmployees);

  // Update hook filters when local filters change
  useEffect(() => {
    searchEmployees(filters.search);
    filterEmployees({
      status: filters.status === 'all' ? undefined : filters.status,
      department: filters.department === 'all' ? undefined : filters.department,
    });
  }, [filters, searchEmployees, filterEmployees]);

  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        await deleteEmployee(id);
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleDeactivateEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await deactivateEmployee(id);
      } catch (error) {
        console.error('Error deactivating employee:', error);
        alert('Failed to deactivate employee. Please try again.');
      }
    }
  };

  const handleSubmitEmployee = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      const employeeData = {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        position: data.position,
        department: data.department,
        hireDate: data.hireDate,
        avatarUrl: data.avatar ? URL.createObjectURL(data.avatar) : undefined,
        managerId: data.managerId || undefined,
        teamIds: [],
        status: data.status,
      };

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id!, employeeData);
      } else {
        await createEmployee(employeeData);
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error submitting employee:', error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (newFilters: EmployeeFilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      department: 'all',
      search: '',
    });
  };

  /**
   * Handle bulk delete
   * Validates Requirements: 10.1, 10.2
   */
  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  /**
   * Confirm bulk delete
   * Deletes all selected employees
   */
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected employees
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteEmployee(id))
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting employees:', error);
      alert('Failed to delete some employees. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /**
   * Handle bulk export
   * Validates Requirements: 10.3
   */
  const handleBulkExport = () => {
    // Prepare data for export
    const exportData = selectedItems.map((employee) => ({
      'Employee ID': employee.employeeId,
      Name: employee.name,
      Email: employee.email,
      Phone: employee.phone,
      Position: employee.position,
      Department: employee.department,
      Status: employee.status,
      'Hire Date': employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '',
      'Manager ID': employee.managerId || '',
      'Created At': employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '',
    }));

    // Generate filename and export
    const filename = generateTimestampedFilename('employees_export');
    exportToCSV(exportData, filename);
  };

  if (error) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <Breadcrumb pageName="Employees" />
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading employees: {error.message}</p>
            <Button onClick={refreshEmployees} className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header with Breadcrumbs */}
        <Breadcrumb pageName="Employees" />

        {/* Page Title and Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">
              Manage employee records and information
            </p>
          </div>
          <Button onClick={handleCreateEmployee} className="flex items-center gap-2 text-white">
            <PlusIcon className="w-4 h-4" />
            Add New Employee
          </Button>
        </div>

        {/* Employee Statistics */}
        {loading ? (
          <StatsGridSkeleton count={3} />
        ) : (
          <EmployeeStatsCard employees={employees} />
        )}

        {/* Filters */}
        <EmployeeFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          availableDepartments={availableDepartments}
        />

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>

        {/* Employee Grid */}
        {loading ? (
          <CardGridSkeleton count={6} />
        ) : filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
                onDeactivate={handleDeactivateEmployee}
                selected={isSelected(employee.id!)}
                onSelect={toggleSelection}
              />
            ))}
          </div>
        ) : (
          filters.search || filters.status !== 'all' || filters.department !== 'all' ? (
            <NoResultsEmptyState 
              onClearFilters={() => setFilters({ search: '', status: 'all', department: 'all' })}
            />
          ) : (
            <NoDataEmptyState 
              entityName="Employees" 
              onAdd={handleCreateEmployee}
            />
          )
        )}

        {/* Bulk Action Toolbar - Requirements 10.1, 10.4 */}
        {selectedCount > 0 && (
          <BulkActionToolbar
            selectedCount={selectedCount}
            totalCount={filteredEmployees.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleBulkExport}
          />
        )}

        {/* Bulk Delete Confirmation Dialog - Requirement 10.2 */}
        <BulkDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          itemCount={selectedCount}
          itemType="employee"
          onConfirm={handleConfirmBulkDelete}
          loading={isBulkDeleting}
        />

        {/* Employee Modal */}
        <EmployeeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEmployee(null);
          }}
          onSubmit={handleSubmitEmployee}
          employee={editingEmployee}
          isLoading={isSubmitting}
          managers={potentialManagers}
        />
      </div>
    </ErrorBoundary>
  );
}