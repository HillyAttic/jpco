import React from 'react';
import { Label } from '@/components/ui/label';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

export interface TeamFilterState {
  status: string;
  department: string;
}

interface TeamFilterProps {
  filters: TeamFilterState;
  onFilterChange: (filters: TeamFilterState) => void;
  onClearFilters: () => void;
  availableDepartments?: string[];
}

/**
 * TeamFilter Component
 * Provides department and status filter dropdowns for team management
 * Validates Requirements: 4.9
 */
export function TeamFilter({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  availableDepartments = []
}: TeamFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      department: e.target.value,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.department !== 'all';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-blue-600 hover:text-blue-700"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Filter - Requirement 4.9 */}
        <div>
          <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Status
          </Label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Department Filter - Requirement 4.9 */}
        <div>
          <Label htmlFor="department-filter" className="text-sm font-medium text-gray-700">
            Department
          </Label>
          <select
            id="department-filter"
            value={filters.department}
            onChange={handleDepartmentChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {availableDepartments.length > 0 ? (
              availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))
            ) : (
              <>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-1 hover:text-blue-900"
                  aria-label="Remove status filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.department !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Department: {filters.department}
                <button
                  onClick={() => onFilterChange({ ...filters, department: 'all' })}
                  className="ml-1 hover:text-green-900"
                  aria-label="Remove department filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}