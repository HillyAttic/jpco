import React from 'react';
import { Label } from '@/components/ui/label';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Employee } from '@/services/employee.service';
import { Client } from '@/services/client.service';

export interface TaskFilterState {
  status: string;
  priority: string;
  assignedTo?: string;
  clientId?: string;
}

interface TaskFilterProps {
  filters: TaskFilterState;
  onFilterChange: (filters: TaskFilterState) => void;
  onClearFilters: () => void;
  employees?: Employee[];
  clients?: Client[];
}

/**
 * TaskFilter Component
 * Provides status, priority, team member, and client filter dropdowns for task management
 * Validates Requirements: 2.7, 2.8
 */
export function TaskFilter({ filters, onFilterChange, onClearFilters, employees = [], clients = [] }: TaskFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: e.target.value,
    });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      priority: e.target.value,
    });
  };

  const handleAssignedToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      assignedTo: e.target.value || undefined,
    });
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      clientId: e.target.value || undefined,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.priority !== 'all' || filters.assignedTo || filters.clientId;

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter - Requirement 2.7 */}
        <div>
          <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </Label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Priority Filter - Requirement 2.8 */}
        <div>
          <Label htmlFor="priority-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Priority
          </Label>
          <select
            id="priority-filter"
            value={filters.priority}
            onChange={handlePriorityChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Team Member Filter */}
        <div>
          <Label htmlFor="assignedTo-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Team Member
          </Label>
          <select
            id="assignedTo-filter"
            value={filters.assignedTo || ''}
            onChange={handleAssignedToChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            aria-label="Filter by team member"
          >
            <option value="">All Team Members</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>

        {/* Client Filter */}
        <div>
          <Label htmlFor="client-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Client
          </Label>
          <select
            id="client-filter"
            value={filters.clientId || ''}
            onChange={handleClientChange}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            aria-label="Filter by client"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.clientName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded-full">
                Status: {filters.status.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
                <button
                  onClick={() => onFilterChange({ ...filters, status: 'all' })}
                  className="ml-1 hover:text-blue-200"
                  aria-label="Remove status filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.priority !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                Priority: {filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)}
                <button
                  onClick={() => onFilterChange({ ...filters, priority: 'all' })}
                  className="ml-1 hover:text-purple-600 dark:hover:text-purple-300"
                  aria-label="Remove priority filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.assignedTo && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                Team Member: {employees.find(e => e.id === filters.assignedTo)?.name || 'Unknown'}
                <button
                  onClick={() => onFilterChange({ ...filters, assignedTo: undefined })}
                  className="ml-1 hover:text-green-600 dark:hover:text-green-300"
                  aria-label="Remove team member filter"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.clientId && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-full">
                Client: {clients.find(c => c.id === filters.clientId)?.clientName || 'Unknown'}
                <button
                  onClick={() => onFilterChange({ ...filters, clientId: undefined })}
                  className="ml-1 hover:text-orange-600 dark:hover:text-orange-300"
                  aria-label="Remove client filter"
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
