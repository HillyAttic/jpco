'use client';

import React, { useState, useEffect } from 'react';
import { useRecurringTasks } from '@/hooks/use-recurring-tasks';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useModal } from '@/contexts/modal-context';
import { teamService } from '@/services/team.service';
import { RecurringTask } from '@/services/recurring-task.service';
import { clientService, Client } from '@/services/client.service';
import { RecurringTaskCard } from '@/components/recurring-tasks/RecurringTaskCard';
import { RecurringTaskListView } from '@/components/recurring-tasks/RecurringTaskListView';
import { RecurringTaskModal } from '@/components/recurring-tasks/RecurringTaskModal';
import { PlanTaskModal } from '@/components/dashboard/PlanTaskModal';
import { ClientListModal } from '@/components/dashboard/ClientListModal';
import { TeamMembersModal } from '@/components/dashboard/TeamMembersModal';
import { DelegateTaskModal } from '@/components/dashboard/DelegateTaskModal';
import { ScheduleTaskModal } from '@/components/dashboard/ScheduleTaskModal';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { WorkflowGridModal } from '@/components/compliance/WorkflowGridModal';
import { WorkflowDrawer } from '@/components/compliance/WorkflowDrawer';
import { getClientCompletedStepIds } from '@/services/recurring-task.service';
import { getReportTypes, getStepsForReportType, initializeWorkflowSteps } from '@/lib/workflow-templates';
import { apiPut, authenticatedFetch } from '@/lib/api-client';

/**
 * Recurring Tasks Page
 * Displays and manages recurring tasks with full CRUD operations and bulk actions
 * Validates Requirements: 3.1, 3.2, 10.1, 10.2, 10.3, 10.4
 */
export default function RecurringTasksPage() {
  const { isAdmin, isManager, user, userProfile } = useEnhancedAuth();
  const { openModal, closeModal } = useModal();
  const router = useRouter();
  const canManageTasks = isAdmin || isManager;
  const canViewAllTasks = isAdmin || isManager;
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
    refreshTasks,
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

  // Dashboard action modal state
  const [showPlanTaskModal, setShowPlanTaskModal] = useState(false);
  const [selectedTaskForPlanning, setSelectedTaskForPlanning] = useState<RecurringTask | null>(null);
  const [showClientListModal, setShowClientListModal] = useState(false);
  const [selectedTaskForClients, setSelectedTaskForClients] = useState<RecurringTask | null>(null);
  const [showTeamMembersModal, setShowTeamMembersModal] = useState(false);
  const [selectedTaskForTeam, setSelectedTaskForTeam] = useState<RecurringTask | null>(null);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [selectedTaskForDelegate, setSelectedTaskForDelegate] = useState<RecurringTask | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTaskForSchedule, setSelectedTaskForSchedule] = useState<RecurringTask | null>(null);

  // Workflow drawer and grid modal state
  const [workflowGridOpen, setWorkflowGridOpen] = useState(false);
  const [gridModalTask, setGridModalTask] = useState<RecurringTask | null>(null);
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false);
  const [selectedWorkflowTask, setSelectedWorkflowTask] = useState<RecurringTask | null>(null);
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);

  // Clients data for resolving client names in workflow grid
  const [clients, setClients] = useState<any[]>([]);

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

  // Load clients for resolving client names in workflow grid
  useEffect(() => {
    const loadClients = async () => {
      try {
        const resp = await authenticatedFetch('/api/clients');
        if (resp.ok) {
          const data = await resp.json();
          setClients(data.data || []);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadClients();
  }, []);

  // Helper: get client name from ID
  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client?.clientName || clientId;
  };

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

      // Calculate the next occurrence based on start date and current date
      const startDate = new Date(data.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      startDate.setHours(0, 0, 0, 0); // Reset time to start of day
      
      // If start date is in the past or today, calculate the next occurrence from today
      let dueDate = startDate;
      if (startDate <= today && !selectedTask?.id) {
        // For new tasks, if start date is today or in the past, calculate next occurrence
        const { calculateNextOccurrence } = await import('@/utils/recurrence-scheduler');
        dueDate = calculateNextOccurrence(today, data.recurrencePattern as any);
      }

      const taskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        contactIds: contactIdsArray,
        categoryId: data.categoryId || undefined,
        recurrencePattern: data.recurrencePattern,
        startDate: startDate,
        dueDate: data.dueDate ? new Date(data.dueDate) : (selectedTask?.dueDate || dueDate),
        teamId: data.teamId || undefined,
        teamMemberMappings: data.teamMemberMappings || undefined, // Include team member mappings
        requiresArn: data.requiresArn || false, // Include ARN requirement
        requiresRemark: data.requiresRemark || false, // Include Remark requirement
        tarEnabled: data.tarEnabled || false, // Include TAR workflow toggle
        statEnabled: data.statEnabled || false, // Include STAT workflow toggle
        tarSteps: data.tarSteps, // Include initialized TAR workflow steps
        statSteps: data.statSteps, // Include initialized STAT workflow steps
        clientFilter: data.clientFilter, // Include client filter for dynamic client tracking
        showUnassignedClients: data.showUnassignedClients, // Include show unassigned clients toggle
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
   * Handle view report for a recurring task
   */
  const handleViewReport = async (task: RecurringTask) => {
    // Navigate to the reports page
    router.push('/reports');
  };

  /**
   * Helper: write updated step objects back into a task (dynamic reportTypes or legacy tarSteps/statSteps)
   */
  const updateTaskSteps = (task: RecurringTask, updatedSteps: any[], workflowType: string): RecurringTask => {
    const lower = workflowType.toLowerCase();
    if (task.reportTypes && task.reportTypes.length > 0) {
      const updatedReportTypes = task.reportTypes.map(rt => {
        if (rt.id === workflowType || rt.id === lower) {
          return { ...rt, steps: updatedSteps };
        }
        return rt;
      });
      return { ...task, reportTypes: updatedReportTypes };
    }
    // Legacy path
    if (lower === 'tar') return { ...task, tarSteps: updatedSteps };
    if (lower === 'stat') return { ...task, statSteps: updatedSteps };
    return task;
  };

  /**
   * Build grid modal entries from task data — filtered by role
   * Uses same filtering logic as calendar page for consistency
   */
  const buildWorkflowEntries = (task: RecurringTask): Record<string, { clientId: string; clientName: string; task: RecurringTask }[]> => {
    const reportTypes = getReportTypes(task);
    const enabledTypes = reportTypes.filter(rt => rt.enabled);
    if (enabledTypes.length === 0) return {};

    const entriesByType: Record<string, { clientId: string; clientName: string; task: RecurringTask }[]> = {};
    const mappings = task.teamMemberMappings || [];

    // Filter by role: admin sees all, non-admin sees own mapping only
    // Match calendar page behavior (isAdmin only, not canViewAllTasks)
    const currentUid = user?.uid;
    const relevantMappings = isAdmin
      ? mappings
      : mappings.filter(m => m.userId === currentUid);

    const allClientIds = [...new Set(relevantMappings.flatMap(m => m.clientIds))];

    enabledTypes.forEach(rt => {
      entriesByType[rt.id] = allClientIds.map(id => ({
        clientId: id,
        clientName: getClientName(id),
        task,
      }));
    });

    return entriesByType;
  };

  /**
   * Handle workflow task click — opens grid modal (no clientId) or drawer (with clientId)
   */
  const handleWorkflowTaskClick = async (
    task: RecurringTask,
    type: string,
    clientId?: string,
    clientName?: string,
  ) => {
    let enrichedTask = { ...task };
    const steps = getStepsForReportType(task, type);

    // Initialize steps if none exist
    if (steps.length === 0) {
      const newSteps = initializeWorkflowSteps(type.toLowerCase() as any);
      if (type.toLowerCase() === 'tar') {
        enrichedTask = { ...enrichedTask, tarSteps: newSteps };
      } else if (type.toLowerCase() === 'stat') {
        enrichedTask = { ...enrichedTask, statSteps: newSteps };
      } else if (enrichedTask.reportTypes) {
        const updatedReportTypes = enrichedTask.reportTypes.map(rt =>
          rt.id === type ? { ...rt, steps: newSteps } : rt
        );
        enrichedTask = { ...enrichedTask, reportTypes: updatedReportTypes };
      }

      // Persist initialized steps to backend
      if (task.id) {
        authenticatedFetch(`/api/workflow/${task.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowType: type }),
        }).catch(err => console.error(`Failed to init ${type} steps for task ${task.id}:`, err));
      }
    }

    // If called from button click (no clientId), show grid modal
    if (!clientId) {
      setGridModalTask(enrichedTask);
      setWorkflowGridOpen(true);
      return;
    }

    // If called from grid modal card click (has clientId), show drawer
    setSelectedWorkflowTask(enrichedTask);
    setSelectedWorkflowType(type);
    setSelectedClientId(clientId || null);
    setSelectedClientName(clientName || null);
    setWorkflowDrawerOpen(true);
  };

  /**
   * Sync updated task data back into both selectedWorkflowTask and gridModalTask
   * so the grid modal reflects the latest toggle state when reopened.
   */
  const syncTaskUpdate = (updatedTask: RecurringTask) => {
    setSelectedWorkflowTask(updatedTask);
    setGridModalTask(prev => prev && prev.id === updatedTask.id ? updatedTask : prev);
  };

  /**
   * Handle step toggle — per-client progress update with optimistic UI
   */
  const handleStepToggle = async (stepId: string, completed: boolean, clientId?: string, remark?: string) => {
    if (!selectedWorkflowTask?.id) return;

    const allSteps = getStepsForReportType(selectedWorkflowTask, selectedWorkflowType);

    // Update clientProgress in local state
    const updatedClientProgress = { ...(selectedWorkflowTask.clientProgress || {}) };
    const existing = updatedClientProgress[clientId || '']
      ? { ...updatedClientProgress[clientId || ''] }
      : { completedStepIds: allSteps.filter((s) => s.completed).map((s) => s.id) };

    const completedStepIds = new Set(existing.completedStepIds || []);
    if (completed) {
      completedStepIds.add(stepId);
    } else {
      completedStepIds.delete(stepId);
    }

    updatedClientProgress[clientId || ''] = {
      completedStepIds: Array.from(completedStepIds),
      completedAt: new Date().toISOString(),
      completedBy: user?.uid,
    };

    // Also update the individual step objects
    const now = new Date();
    const updatedSteps = allSteps.map((s) => {
      if (s.id === stepId) {
        const updatedStep = {
          ...s,
          completed,
          completedAt: completed ? now : undefined,
          completedBy: completed ? user?.uid : undefined,
        };
        if (remark !== undefined) {
          if (completed && remark.trim()) {
            updatedStep.remark = remark.trim();
            updatedStep.remarkBy = user?.uid;
            updatedStep.remarkAt = now;
          } else if (!completed) {
            updatedStep.remark = undefined;
            updatedStep.remarkBy = undefined;
            updatedStep.remarkAt = undefined;
          }
        }
        return updatedStep;
      }
      return s;
    });

    // Write updated steps back into the task
    const updatedTask = updateTaskSteps(
      { ...selectedWorkflowTask, clientProgress: updatedClientProgress },
      updatedSteps,
      selectedWorkflowType,
    );

    // Update all local state sources optimistically
    syncTaskUpdate(updatedTask);

    // Persist to API
    try {
      await apiPut(`/api/workflow/${selectedWorkflowTask.id}`, {
        stepId,
        workflowType: selectedWorkflowType,
        completed,
        clientId: clientId || undefined,
        remark,
      });
      // Refresh the hook's tasks to keep them in sync for when the modal is reopened
      await refreshTasks();
    } catch (error) {
      console.error('Failed to update workflow step:', error);
      // Revert on error — reload from server
      setSelectedWorkflowTask(selectedWorkflowTask);
      setGridModalTask(prev => prev && prev.id === selectedWorkflowTask.id ? selectedWorkflowTask : prev);
    }
  };

  /**
   * Handle mark all steps complete — per-client
   */
  const handleMarkAllComplete = async (clientId?: string) => {
    if (!selectedWorkflowTask?.id) return;

    const allSteps = getStepsForReportType(selectedWorkflowTask, selectedWorkflowType);
    const allStepIds = allSteps.map((s) => s.id);
    const now = new Date();

    const updatedClientProgress = { ...(selectedWorkflowTask.clientProgress || {}) };
    updatedClientProgress[clientId || ''] = {
      completedStepIds: [...allStepIds],
      completedAt: now.toISOString(),
      completedBy: user?.uid,
    };

    const updatedSteps = allSteps.map((s) => ({
      ...s,
      completed: true,
      completedAt: now,
      completedBy: user?.uid,
    }));

    const updatedTask = updateTaskSteps(
      { ...selectedWorkflowTask, clientProgress: updatedClientProgress },
      updatedSteps,
      selectedWorkflowType,
    );

    // Update all local state sources optimistically
    syncTaskUpdate(updatedTask);

    // Persist each step for this client
    for (const stepId of allStepIds) {
      try {
        await authenticatedFetch(`/api/workflow/${selectedWorkflowTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stepId,
            workflowType: selectedWorkflowType,
            completed: true,
            clientId: clientId || undefined,
          }),
        });
      } catch (error) {
        console.error('Failed to mark step complete:', error);
      }
    }

    // Refresh tasks to keep them in sync
    await refreshTasks();
  };

  // Common action button props for list and card views
  const actionButtonProps = {
    currentUserId: user?.uid,
    canViewAllTasks,
    isManager,
    onClientsClick: (task: RecurringTask) => {
      setSelectedTaskForClients(task);
      setShowClientListModal(true);
      openModal();
    },
    onTeamClick: (task: RecurringTask) => {
      setSelectedTaskForTeam(task);
      setShowTeamMembersModal(true);
      openModal();
    },
    onPlanClick: (task: RecurringTask) => {
      setSelectedTaskForPlanning(task);
      setShowPlanTaskModal(true);
      openModal();
    },
    onDelegateClick: (task: RecurringTask) => {
      setSelectedTaskForDelegate(task);
      setShowDelegateModal(true);
      openModal();
    },
    onScheduleClick: (task: RecurringTask) => {
      setSelectedTaskForSchedule(task);
      setShowScheduleModal(true);
      openModal();
    },
    onGoToReportsClick: () => {
      router.push('/reports');
    },
    onUpdateProgressClick: (task: RecurringTask) => {
      setGridModalTask(task);
      setWorkflowGridOpen(true);
      openModal();
    },
  };

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
              onViewReport={handleViewReport}
              selected={Array.from(selectedIds)}
              onSelect={(id) => toggleSelection(id, !selectedIds.has(id))}
              canManageTasks={canManageTasks}
              teamNames={teamNames}
              {...actionButtonProps}
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
                  onViewReport={handleViewReport}
                  {...actionButtonProps}
                />
              ))}
            </div>
          )
        )}

        {/* Task Count */}
        {tasks.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
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
            <div className="bg-white dark:bg-gray-dark rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Recurring Task
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
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

      {/* Plan Task Modal */}
      {showPlanTaskModal && selectedTaskForPlanning && (
        <PlanTaskModal
          isOpen={showPlanTaskModal}
          onClose={() => { setShowPlanTaskModal(false); setSelectedTaskForPlanning(null); closeModal(); }}
          assignedClientIds={selectedTaskForPlanning.teamMemberMappings?.find(m => m.userId === user?.uid)?.clientIds || []}
          userId={user?.uid || ''}
          userName={userProfile?.displayName || user?.email || 'Unknown User'}
          taskTitle={selectedTaskForPlanning.title}
          recurringTaskId={selectedTaskForPlanning.id}
        />
      )}

      {/* Client List Modal */}
      {showClientListModal && selectedTaskForClients && (
        <ClientListModal
          isOpen={showClientListModal}
          onClose={() => { setShowClientListModal(false); setSelectedTaskForClients(null); closeModal(); }}
          taskTitle={selectedTaskForClients.title}
          clientIds={(() => {
            const mappings = selectedTaskForClients.teamMemberMappings;
            if (mappings && mappings.length > 0) {
              // Admin/manager sees all clients from all mappings
              if (isAdmin || isManager) {
                const allMappedIds = [...new Set(mappings.flatMap(m => m.clientIds))];
                return allMappedIds.length > 0 ? allMappedIds : (selectedTaskForClients.contactIds || []);
              }
              // Regular user sees only their assigned clients
              return mappings.find(m => m.userId === user?.uid)?.clientIds || selectedTaskForClients.contactIds || [];
            }
            return selectedTaskForClients.contactIds || [];
          })()}
          isTeamMemberMapping={!!selectedTaskForClients.teamMemberMappings && selectedTaskForClients.teamMemberMappings.length > 0}
          teamMemberName={
            !isAdmin && !isManager && selectedTaskForClients.teamMemberMappings && user
              ? selectedTaskForClients.teamMemberMappings.find(m => m.userId === user.uid)?.userName
              : undefined
          }
        />
      )}

      {/* Team Members Modal */}
      {showTeamMembersModal && selectedTaskForTeam && (
        <TeamMembersModal
          isOpen={showTeamMembersModal}
          onClose={() => { setShowTeamMembersModal(false); setSelectedTaskForTeam(null); closeModal(); }}
          taskTitle={selectedTaskForTeam.title}
          teamMembers={selectedTaskForTeam.teamMemberMappings || []}
          teamId={selectedTaskForTeam.teamId}
        />
      )}

      {/* Delegate Task Modal */}
      {showDelegateModal && selectedTaskForDelegate && (
        <DelegateTaskModal
          isOpen={showDelegateModal}
          onClose={() => { setShowDelegateModal(false); setSelectedTaskForDelegate(null); closeModal(); }}
          taskId={selectedTaskForDelegate.id || ''}
          taskTitle={selectedTaskForDelegate.title}
          currentUserId={user?.uid || ''}
          currentUserName={userProfile?.displayName || user?.email || 'Unknown User'}
          currentUserRole={isAdmin ? 'admin' : isManager ? 'manager' : 'employee'}
          assignedClientIds={
            selectedTaskForDelegate.teamMemberMappings?.find(m => m.userId === user?.uid)?.clientIds || selectedTaskForDelegate.contactIds || []
          }
          teamMemberMappings={selectedTaskForDelegate.teamMemberMappings}
          onDelegated={() => { window.location.reload(); }}
        />
      )}

      {/* Schedule Task Modal */}
      {showScheduleModal && selectedTaskForSchedule && (
        <ScheduleTaskModal
          isOpen={showScheduleModal}
          onClose={() => { setShowScheduleModal(false); setSelectedTaskForSchedule(null); closeModal(); }}
          taskId={selectedTaskForSchedule.id || ''}
          taskTitle={selectedTaskForSchedule.title}
          currentUserId={user?.uid || ''}
          teamMemberMappings={selectedTaskForSchedule.teamMemberMappings}
          contactIds={selectedTaskForSchedule.contactIds}
          onScheduled={() => {}}
        />
      )}

      {/* Workflow Grid Modal */}
      {workflowGridOpen && gridModalTask && (
        <WorkflowGridModal
          open={workflowGridOpen}
          onClose={() => { setWorkflowGridOpen(false); setGridModalTask(null); closeModal(); }}
          task={gridModalTask}
          entriesByType={buildWorkflowEntries(gridModalTask)}
          onCardUpdate={(task, type, clientId, clientName) => {
            handleWorkflowTaskClick(task, type, clientId, clientName);
          }}
        />
      )}

      {/* Workflow Drawer */}
      {workflowDrawerOpen && selectedWorkflowTask && (
        <WorkflowDrawer
          open={workflowDrawerOpen}
          onOpenChange={(open) => { if (!open) { setWorkflowDrawerOpen(false); setSelectedWorkflowTask(null); } }}
          taskId={selectedWorkflowTask.id!}
          taskTitle={selectedWorkflowTask.title}
          workflowType={selectedWorkflowType as any}
          steps={getStepsForReportType(selectedWorkflowTask, selectedWorkflowType)}
          completedStepIds={
            selectedClientId
              ? getClientCompletedStepIds(selectedWorkflowTask, selectedClientId, selectedWorkflowType)
              : []
          }
          clientId={selectedClientId || undefined}
          clientName={selectedClientName || undefined}
          assignee={(userProfile?.displayName ?? undefined) || (user?.email ?? undefined)}
          onStepToggle={handleStepToggle}
          onMarkAllComplete={handleMarkAllComplete}
          reportTypeConfig={getReportTypes(selectedWorkflowTask).find(rt => rt.id === selectedWorkflowType)}
        />
      )}

    </ErrorBoundary>
  );
}