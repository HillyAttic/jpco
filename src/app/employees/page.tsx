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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // 'grid' or 'list' view mode

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
        // For new employees, pass the password to create Firebase Auth account
        await createEmployee(employeeData, data.password);
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

        {/* Results Summary and View Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
          
          {/* View Toggle Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              aria-label="Grid view"
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
              aria-label="List view"
            >
              List
            </button>
          </div>
        </div>

        {/* Employee Grid/List View */}
        {loading ? (
          <CardGridSkeleton count={6} />
        ) : filteredEmployees.length > 0 ? (
          viewMode === 'grid' ? (
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
            /* List View */
            <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-1">Select</div>
                <div className="col-span-2">ID</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Position</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => (
                  <div 
                    key={employee.id} 
                    className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm ${isSelected(employee.id!) ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-dark'}`}
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected(employee.id!)}
                        onChange={() => toggleSelection(employee.id!)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                    <div className="col-span-2 font-medium text-gray-900 dark:text-white">{employee.employeeId}</div>
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900 dark:text-white">{employee.name}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{employee.email}</div>
                    </div>
                    <div className="col-span-2 text-gray-700 dark:text-gray-300">{employee.position}</div>
                    <div className="col-span-2 text-gray-700 dark:text-gray-300">{employee.department}</div>
                    <div className="col-span-1">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${employee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : employee.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {employee.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="col-span-1 flex space-x-2">
                      <button 
                        onClick={() => handleEditEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        aria-label="Edit employee"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(employee.id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Delete employee"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
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