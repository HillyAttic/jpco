'use client';

import React, { useState } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { NonRecurringTask } from '@/services/nonrecurring-task.service';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskListView } from '@/components/tasks/TaskListView';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskFilter, TaskFilterState } from '@/components/tasks/TaskFilter';
import { TaskStatsCard } from '@/components/tasks/TaskStatsCard';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton, StatsGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * Non-Recurring Tasks Page
 * Manages one-time tasks with full CRUD operations, filtering, and search
 * Validates Requirements: 2.1, 2.2, 2.3, 10.1, 10.2, 10.3, 10.4
 */
export default function NonRecurringTasksPage() {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    searchTasks,
    filterTasks,
  } = useTasks();

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
  } = useBulkSelection(tasks);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<NonRecurringTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFilterState>({
    status: 'all',
    priority: 'all',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchTasks(query);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: TaskFilterState) => {
    setFilters(newFilters);
    
    // Convert 'all' to undefined for API
    const apiFilters = {
      status: newFilters.status !== 'all' ? newFilters.status : undefined,
      priority: newFilters.priority !== 'all' ? newFilters.priority : undefined,
    };
    
    filterTasks(apiFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({ status: 'all', priority: 'all' });
    filterTasks({});
  };

  // Open modal for creating new task
  const handleCreateNew = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  // Open modal for editing task
  const handleEdit = (task: NonRecurringTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Handle delete with confirmation
  const handleDelete = async (id: string) => {
    if (showDeleteConfirm === id) {
      try {
        await deleteTask(id);
        setShowDeleteConfirm(null);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task. Please try again.');
      }
    } else {
      setShowDeleteConfirm(id);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => {
        setShowDeleteConfirm(null);
      }, 3000);
    }
  };

  // Handle toggle complete
  const handleToggleComplete = async (id: string) => {
    try {
      await toggleComplete(id);
    } catch (error) {
      console.error('Error toggling task completion:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  // Handle form submission
  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    
    try {
      // Convert assignedTo string (employee IDs) to array
      const assignedToArray = formData.assignedTo
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);

      const taskData = {
        title: formData.title,
        description: formData.description,
        dueDate: new Date(formData.dueDate),
        priority: formData.priority,
        status: formData.status,
        assignedTo: assignedToArray,
        categoryId: formData.categoryId || undefined,
        contactId: formData.contactId || undefined,
      };

      if (selectedTask) {
        await updateTask(selectedTask.id!, taskData);
      } else {
        await createTask(taskData);
      }

      setIsModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error submitting task:', error);
      throw error; // Let the modal handle the error display
    } finally {
      setIsSubmitting(false);
    }
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
   */
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected tasks
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteTask(id))
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting tasks:', error);
      alert('Failed to delete some tasks. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Convert NonRecurringTask to Task type for components
  const convertToTaskType = (task: NonRecurringTask): any => ({
    id: task.id!,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignedTo: task.assignedTo,
    category: task.categoryId,
    categoryId: task.categoryId,
    contactId: task.contactId,
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Breadcrumb - Requirement 2.1 */}
        <Breadcrumb pageName="Non-Recurring Tasks" />

        {/* Page Header with Action Button - Requirement 2.1 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Non-Recurring Tasks</h1>
            <p className="text-gray-600 mt-2">Manage one-time tasks and track their progress</p>
          </div>
          
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2 text-white"
            aria-label="Add new task"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Task
          </Button>
        </div>

        {/* Task Statistics - Requirement 2.10 */}
        {loading ? (
          <StatsGridSkeleton count={4} />
        ) : (
          <TaskStatsCard tasks={tasks.map(convertToTaskType)} />
        )}

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search tasks by title, description, or assignee..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
            aria-label="Search tasks"
          />
        </div>

        {/* Task Filter - Requirements 2.7, 2.8 */}
        <TaskFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {error.message}
            </p>
          </div>
        )}

        {/* View Toggle Buttons */}
        {!loading && tasks.length > 0 && (
          <div className="flex justify-end">
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
        )}

        {/* Loading State */}
        {loading && (
          <CardGridSkeleton count={6} />
        )}

        {/* Task Grid/List - Requirement 2.1 */}
        {!loading && tasks.length > 0 && (
          viewMode === 'list' ? (
            <TaskListView
              tasks={tasks.map(convertToTaskType)}
              onEdit={(task) => {
                const originalTask = tasks.find(t => t.id === task.id);
                if (originalTask) handleEdit(originalTask);
              }}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
              selected={Array.from(selectedIds)}
              onSelect={(id) => toggleSelection(id, !selectedIds.has(id))}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <div key={task.id} className="relative">
                  <TaskCard
                    task={convertToTaskType(task)}
                    onEdit={() => handleEdit(task)}
                    onDelete={handleDelete}
                    onToggleComplete={handleToggleComplete}
                    selected={isSelected(task.id!)}
                    onSelect={toggleSelection}
                  />
                  
                  {/* Delete Confirmation Overlay */}
                  {showDeleteConfirm === task.id && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-90 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center text-white p-4">
                        <p className="font-semibold mb-2">Delete this task?</p>
                        <p className="text-sm mb-4">Click delete again to confirm</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && (
          searchQuery || filters.status !== 'all' || filters.priority !== 'all' ? (
            <NoResultsEmptyState 
              onClearFilters={() => {
                setSearchQuery('');
                setFilters({ status: 'all', priority: 'all' });
              }}
            />
          ) : (
            <NoDataEmptyState 
              entityName="Tasks" 
              onAdd={handleCreateNew}
            />
          )
        )}

        {/* Bulk Action Toolbar - Requirements 10.1, 10.4 */}
        {selectedCount > 0 && (
          <BulkActionToolbar
            selectedCount={selectedCount}
            totalCount={tasks.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
          />
        )}

        {/* Bulk Delete Confirmation Dialog - Requirement 10.2 */}
        <BulkDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          itemCount={selectedCount}
          itemType="task"
          onConfirm={handleConfirmBulkDelete}
          loading={isBulkDeleting}
        />

        {/* Task Modal - Requirements 2.2, 2.3 */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={handleSubmit}
          task={selectedTask ? convertToTaskType(selectedTask) : null}
          isLoading={isSubmitting}
        />
      </div>
    </ErrorBoundary>
  );
}
