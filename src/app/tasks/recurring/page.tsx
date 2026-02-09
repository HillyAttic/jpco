'use client';

import React, { useState, useEffect } from 'react';
import { useRecurringTasks } from '@/hooks/use-recurring-tasks';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { teamService } from '@/services/team.service';
import { RecurringTask } from '@/services/recurring-task.service';
import { RecurringTaskCard } from '@/components/recurring-tasks/RecurringTaskCard';
import { RecurringTaskListView } from '@/components/recurring-tasks/RecurringTaskListView';
import { RecurringTaskModal } from '@/components/recurring-tasks/RecurringTaskModal';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';

/**
 * Recurring Tasks Page
 * Displays and manages recurring tasks with full CRUD operations and bulk actions
 * Validates Requirements: 3.1, 3.2, 10.1, 10.2, 10.3, 10.4
 */
export default function RecurringTasksPage() {
  const { isAdmin, isManager } = useEnhancedAuth();
  const canManageTasks = isAdmin || isManager;
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Load team names for display
  useEffect(() => {
    const loadTeamNames = async () => {
      try {
        const teams = await teamService.getAll({ status: 'active' });
        const namesMap: Record<string, string> = {};
        teams.forEach(team => {
          if (team.id) {
            namesMap[team.id] = team.name;
          }
        });
        setTeamNames(namesMap);
      } catch (error) {
        console.error('Error loading team names:', error);
      }
    };

    loadTeamNames();
  }, []);

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
      console.log('📝 [Recurring Tasks Page] Form data received:', data);
      
      // Convert contactIds string to array
      const contactIdsArray = data.contactIds
        ? data.contactIds
            .split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0)
        : [];

      const taskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        contactIds: contactIdsArray,
        categoryId: data.categoryId || undefined,
        recurrencePattern: data.recurrencePattern,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        nextOccurrence: new Date(data.startDate), // Initial next occurrence is start date
        teamId: data.teamId || undefined,
        teamMemberMappings: data.teamMemberMappings || undefined, // Include team member mappings
        requiresArn: data.requiresArn || false, // Include ARN requirement
      };

      console.log('📤 [Recurring Tasks Page] Sending task data to API:', taskData);
      console.log('🗺️ [Recurring Tasks Page] Team member mappings:', taskData.teamMemberMappings);

      if (selectedTask?.id) {
        // Update existing task
        await updateTask(selectedTask.id, taskData);
        console.log('✅ [Recurring Tasks Page] Task updated successfully');
      } else {
        // Create new task
        await createTask(taskData);
        console.log('✅ [Recurring Tasks Page] Task created successfully');
      }

      setIsModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('❌ [Recurring Tasks Page] Error submitting recurring task:', error);
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
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header with Add Button */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Recurring Tasks</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
              Manage tasks that repeat on a schedule
            </p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="flex items-center justify-center gap-2 text-white w-full md:w-auto md:self-end"
            aria-label="Create new recurring task"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Recurring Task</span>
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

        {/* View Toggle Buttons */}
        {!loading && tasks.length > 0 && (
          <div className="flex justify-end">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 md:py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                aria-label="Grid view"
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 md:py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                aria-label="List view"
              >
                List
              </button>
            </div>
          </div>
        )}

        {/* Task Grid/List */}
        {tasks.length > 0 && (
          viewMode === 'list' ? (
            <RecurringTaskListView
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPause={handlePause}
              onResume={handleResume}
              selected={Array.from(selectedIds)}
              onSelect={(id) => toggleSelection(id, !selectedIds.has(id))}
              canManageTasks={canManageTasks}
              teamNames={teamNames}
            />
          ) : (
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
          )
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