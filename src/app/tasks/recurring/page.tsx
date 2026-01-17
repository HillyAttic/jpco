'use client';

import React, { useState } from 'react';
import { useRecurringTasks } from '@/hooks/use-recurring-tasks';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { RecurringTask } from '@/services/recurring-task.service';
import { RecurringTaskCard } from '@/components/recurring-tasks/RecurringTaskCard';
import { RecurringTaskModal } from '@/components/recurring-tasks/RecurringTaskModal';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { exportToCSV, generateTimestampedFilename } from '@/utils/csv-export';

/**
 * Recurring Tasks Page
 * Displays and manages recurring tasks with full CRUD operations and bulk actions
 * Validates Requirements: 3.1, 3.2, 10.1, 10.2, 10.3, 10.4
 */
export default function RecurringTasksPage() {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
  } = useRecurringTasks();

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
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  /**
   * Handle opening modal for creating new task
   */
  const handleCreateNew = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  /**
   * Handle opening modal for editing existing task
   */
  const handleEdit = (task: RecurringTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Convert assignedTo string to array
      const assignedToArray = data.assignedTo
        .split(',')
        .map((name: string) => name.trim())
        .filter((name: string) => name.length > 0);

      const taskData = {
        title: data.title,
        description: data.description,
        dueDate: new Date(data.dueDate),
        priority: data.priority,
        status: data.status,
        assignedTo: assignedToArray,
        category: data.category || undefined,
        recurrencePattern: data.recurrencePattern,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        nextOccurrence: new Date(data.startDate), // Initial next occurrence is start date
        teamId: data.teamId || undefined,
      };

      if (selectedTask?.id) {
        // Update existing task
        await updateTask(selectedTask.id, taskData);
      } else {
        // Create new task
        await createTask(taskData);
      }

      setIsModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error submitting recurring task:', error);
      // Error is already handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle delete with confirmation
   * Validates Requirements: 3.10
   */
  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  /**
   * Confirm delete with option selection
   */
  const confirmDelete = async (option: 'all' | 'stop') => {
    if (!deleteConfirmId) return;

    try {
      await deleteTask(deleteConfirmId, option);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting recurring task:', error);
    }
  };

  /**
   * Handle pause task
   * Validates Requirements: 3.5
   */
  const handlePause = async (id: string) => {
    try {
      await pauseTask(id);
    } catch (error) {
      console.error('Error pausing recurring task:', error);
    }
  };

  /**
   * Handle resume task
   * Validates Requirements: 3.5
   */
  const handleResume = async (id: string) => {
    try {
      await resumeTask(id);
    } catch (error) {
      console.error('Error resuming recurring task:', error);
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
   * Deletes all selected recurring tasks with 'all' option
   */
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected tasks with 'all' option (delete all future occurrences)
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteTask(id, 'all'))
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting recurring tasks:', error);
      alert('Failed to delete some tasks. Please try again.');
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
    const exportData = selectedItems.map((task) => ({
      Title: task.title,
      Description: task.description,
      Status: task.status,
      Priority: task.priority,
      'Recurrence Pattern': task.recurrencePattern,
      'Next Occurrence': task.nextOccurrence ? new Date(task.nextOccurrence).toLocaleDateString() : '',
      'Start Date': task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
      'End Date': task.endDate ? new Date(task.endDate).toLocaleDateString() : '',
      'Is Paused': task.isPaused ? 'Yes' : 'No',
      'Assigned To': task.assignedTo?.join(', ') || '',
      'Team ID': task.teamId || '',
      'Completion Count': task.completionHistory?.length || 0,
      'Created At': task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '',
    }));

    // Generate filename and export
    const filename = generateTimestampedFilename('recurring_tasks_export');
    exportToCSV(exportData, filename);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Breadcrumb - Requirement 3.1 */}
        <Breadcrumb pageName="Recurring Tasks" />

        {/* Page Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recurring Tasks</h1>
            <p className="text-gray-600 mt-2">
              Manage tasks that repeat on a schedule
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2"
            aria-label="Create new recurring task"
          >
            <PlusIcon className="w-5 h-5" />
            Add Recurring Task
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading recurring tasks</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && tasks.length === 0 && (
          <CardGridSkeleton count={6} />
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && !error && (
          <NoDataEmptyState 
            entityName="Recurring Tasks" 
            onAdd={handleCreateNew}
          />
        )}

        {/* Task Grid */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <RecurringTaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPause={handlePause}
                onResume={handleResume}
                selected={isSelected(task.id!)}
                onSelect={toggleSelection}
              />
            ))}
          </div>
        )}

        {/* Task Count */}
        {tasks.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Showing {tasks.length} recurring {tasks.length === 1 ? 'task' : 'tasks'}
          </div>
        )}

        {/* Bulk Action Toolbar - Requirements 10.1, 10.4 */}
        {selectedCount > 0 && (
          <BulkActionToolbar
            selectedCount={selectedCount}
            totalCount={tasks.length}
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
          itemType="recurring task"
          onConfirm={handleConfirmBulkDelete}
          loading={isBulkDeleting}
        />

        {/* Create/Edit Modal */}
        <RecurringTaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
          }}
          onSubmit={handleSubmit}
          task={selectedTask}
          isLoading={isSubmitting}
        />

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Recurring Task
              </h3>
              <p className="text-gray-600 mb-6">
                How would you like to handle this recurring task?
              </p>
              <div className="space-y-3">
                <Button
                  variant="danger"
                  onClick={() => confirmDelete('all')}
                  className="w-full"
                >
                  Delete All Future Occurrences
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => confirmDelete('stop')}
                  className="w-full"
                >
                  Stop Recurrence (Keep History)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}