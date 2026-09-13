'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import {
  recurringTaskService,
  RecurringTask,
  WorkflowStep,
  WorkflowType,
  getClientCompletedStepIds,
} from '@/services/recurring-task.service';
import { calculateAllOccurrences } from '@/utils/recurrence-scheduler';
import { CalendarView } from '@/components/calendar-view';
import { MobileCalendarView } from '@/components/mobile-calendar-view';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { TaskCreationModal } from '@/components/task-creation-modal';
import { WorkflowDrawer } from '@/components/compliance/WorkflowDrawer';
import { WorkflowGridModal } from '@/components/compliance/WorkflowGridModal';
import { initializeWorkflowSteps, getWorkflowTemplate, getReportTypes, getStepsForReportType } from '@/lib/workflow-templates';
import { auth } from '@/lib/firebase';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { apiPut, authenticatedFetch } from '@/lib/api-client';

// Extended task type to include recurring task occurrences
interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
  tarEnabled?: boolean;
  statEnabled?: boolean;
}

/** Per-client workflow entry for the TAR/STAT card grids */
interface ClientWorkflowEntry {
  clientId: string;
  clientName: string;
  task: RecurringTask;
}

export default function CalendarPage() {
  const { isAdmin } = useEnhancedAuth();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [nonRecurringTasks, setNonRecurringTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [unassignedClientIdsMap, setUnassignedClientIdsMap] = useState<Record<string, string[]>>({});
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'mobile' : 'desktop';
    }
    return 'desktop';
  });

  // Workflow drawer state
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false);
  const [selectedWorkflowTask, setSelectedWorkflowTask] = useState<RecurringTask | null>(null);
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<WorkflowType>('TAR');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);

  // Workflow grid modal state (shown on calendar event click)
  const [workflowGridOpen, setWorkflowGridOpen] = useState(false);
  const [gridModalTask, setGridModalTask] = useState<RecurringTask | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  /**
   * For admin users: fetch unassigned clients per task (clients matching
   * the task's clientFilter that are NOT in any teamMemberMapping).
   * These are shown in the calendar workflow grid alongside assigned clients.
   * Non-admin users (managers/employees) do NOT see unassigned clients.
   */
  useEffect(() => {
    if (!isAdmin || recurringTasks.length === 0) {
      setUnassignedClientIdsMap({});
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    let cancelled = false;

    currentUser.getIdToken().then(token => {
      if (cancelled) return;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      Promise.all(
        recurringTasks
          .filter(t => t.id && t.clientFilter && t.clientFilter !== 'all')
          .map(async (task) => {
            try {
              const resp = await fetch(
                `/api/recurring-tasks/${task.id}/unassigned-clients`,
                { headers }
              );
              if (!resp.ok) return { taskId: task.id!, ids: [] };
              const data = await resp.json();
              return { taskId: task.id!, ids: data.unassignedClientIds || [] };
            } catch {
              return { taskId: task.id!, ids: [] };
            }
          })
      ).then(results => {
        if (cancelled) return;
        const map: Record<string, string[]> = {};
        results.forEach(({ taskId, ids }) => {
          if (ids.length > 0) map[taskId] = ids;
        });
        setUnassignedClientIdsMap(map);
      });
    });

    return () => { cancelled = true; };
  }, [isAdmin, recurringTasks]);

  /**
   * Generate calendar task occurrences from recurring tasks
   */
  const generateRecurringTaskOccurrences = React.useCallback((recurringTasks: RecurringTask[]): CalendarTask[] => {
    const calendarTasks: CalendarTask[] = [];

    const calendarStartDate = new Date();
    calendarStartDate.setFullYear(calendarStartDate.getFullYear() - 1);
    calendarStartDate.setMonth(0);
    calendarStartDate.setDate(1);

    const calendarEndDate = new Date();
    calendarEndDate.setFullYear(calendarEndDate.getFullYear() + 1);
    calendarEndDate.setMonth(11);
    calendarEndDate.setDate(31);

    recurringTasks.forEach(recurringTask => {
      if (recurringTask.isPaused) return;

      const taskDueDate = new Date(recurringTask.dueDate);
      const taskEndDate = calendarEndDate;
      const occurrenceStartDate = taskDueDate > calendarStartDate ? taskDueDate : calendarStartDate;
      const occurrenceEndDate = taskEndDate < calendarEndDate ? taskEndDate : calendarEndDate;

      if (occurrenceStartDate > calendarEndDate || occurrenceEndDate < calendarStartDate) {
        return;
      }

      try {
        const occurrences = calculateAllOccurrences(
          occurrenceStartDate,
          occurrenceEndDate,
          recurringTask.recurrencePattern
        );

        occurrences.forEach(occurrenceDate => {
          const wasCompleted = recurringTask.completionHistory.some(completion => {
            const completionDate = new Date(completion.date);
            return (
              completionDate.getDate() === occurrenceDate.getDate() &&
              completionDate.getMonth() === occurrenceDate.getMonth() &&
              completionDate.getFullYear() === occurrenceDate.getFullYear()
            );
          });

          calendarTasks.push({
            id: `${recurringTask.id}-${occurrenceDate.getTime()}`,
            title: recurringTask.title,
            description: recurringTask.description,
            dueDate: occurrenceDate,
            priority: recurringTask.priority as TaskPriority,
            status: wasCompleted ? TaskStatus.COMPLETED : recurringTask.status as TaskStatus,
            assignedTo: recurringTask.contactIds || [],
            category: recurringTask.categoryId,
            createdAt: recurringTask.createdAt || new Date(),
            updatedAt: recurringTask.updatedAt || new Date(),
            isRecurring: true,
            recurringTaskId: recurringTask.id,
            recurrencePattern: recurringTask.recurrencePattern,
            tarEnabled: recurringTask.tarEnabled,
            statEnabled: recurringTask.statEnabled,
          });
        });
      } catch (error) {
        console.error(`Error generating occurrences for task ${recurringTask.id}:`, error);
      }
    });

    return calendarTasks;
  }, []);

  const recurringCalendarTasks = React.useMemo(() => {
    return generateRecurringTaskOccurrences(recurringTasks);
  }, [recurringTasks, generateRecurringTaskOccurrences]);

  const allTasks = React.useMemo(() => {
    return recurringCalendarTasks;
  }, [recurringCalendarTasks]);

  useEffect(() => {
    setTasks(allTasks);
  }, [allTasks]);

  // Helper: extract client IDs visible to the current user from a task
  const getClientIdsForTask = (task: RecurringTask): string[] => {
    const currentUid = auth.currentUser?.uid;

    // Admins see all clients from all mappings + unassigned clients (from clientFilter)
    if (isAdmin) {
      const ids = new Set<string>();
      (task.contactIds || []).forEach(id => ids.add(id));
      (task.teamMemberMappings || []).forEach(m => {
        (m.clientIds || []).forEach(id => ids.add(id));
      });
      // Include unassigned clients (matching clientFilter, not in any mapping)
      const unassigned = unassignedClientIdsMap[task.id || ''] || [];
      unassigned.forEach(id => ids.add(id));
      return Array.from(ids);
    }

    // Non-admins: only their own mapping's clients
    const userMapping = (task.teamMemberMappings || []).find(m => m.userId === currentUid);
    if (userMapping) {
      return [...userMapping.clientIds];
    }

    // Fallback: if no mappings at all, use contactIds (legacy tasks)
    if (!task.teamMemberMappings || task.teamMemberMappings.length === 0) {
      return [...(task.contactIds || [])];
    }

    // User has no mapping on this task → no clients to show
    return [];
  };

  // Helper: get client name from ID
  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client?.clientName || 'Unassigned';
  };

  // Group TAR-enabled tasks by client (supports dynamic report types)
  const tarClientGroups = React.useMemo((): ClientWorkflowEntry[] => {
    const entries: ClientWorkflowEntry[] = [];

    recurringTasks.forEach(task => {
      const reportTypes = getReportTypes(task);
      const tarEnabled = reportTypes.some(rt => rt.id === 'tar' && rt.enabled);
      if (!tarEnabled) return;
      const clientIds = getClientIdsForTask(task);
      const names = clientIds.length > 0
        ? [...new Set(clientIds.map(id => getClientName(id)))]
        : ['Unassigned'];

      clientIds.forEach((clientId, idx) => {
        entries.push({
          clientId,
          clientName: names[idx] || getClientName(clientId),
          task,
        });
      });

      if (clientIds.length === 0) {
        entries.push({ clientId: '', clientName: 'Unassigned', task });
      }
    });

    return entries;
  }, [recurringTasks, clients, isAdmin, unassignedClientIdsMap]);

  // Group STAT-enabled tasks by client (supports dynamic report types)
  const statClientGroups = React.useMemo((): ClientWorkflowEntry[] => {
    const entries: ClientWorkflowEntry[] = [];

    recurringTasks.forEach(task => {
      const reportTypes = getReportTypes(task);
      const statEnabled = reportTypes.some(rt => rt.id === 'stat' && rt.enabled);
      if (!statEnabled) return;
      const clientIds = getClientIdsForTask(task);
      const names = clientIds.length > 0
        ? [...new Set(clientIds.map(id => getClientName(id)))]
        : ['Unassigned'];

      clientIds.forEach((clientId, idx) => {
        entries.push({
          clientId,
          clientName: names[idx] || getClientName(clientId),
          task,
        });
      });

      if (clientIds.length === 0) {
        entries.push({ clientId: '', clientName: 'Unassigned', task });
      }
    });

    return entries;
  }, [recurringTasks, clients, isAdmin, unassignedClientIdsMap]);

  const hasTarTasks = tarClientGroups.length > 0;
  const hasStatTasks = statClientGroups.length > 0;

  const loadTasks = async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log('Waiting for user authentication...');
      }

      const fetchRecurring = async () => {
        if (!currentUser) return [];
        const token = await currentUser.getIdToken();
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        const recurringResponse = await fetch('/api/recurring-tasks?view=calendar', { headers });
        if (!recurringResponse.ok) {
          throw new Error('Failed to fetch recurring tasks');
        }
        return await recurringResponse.json();
      };

      const [nonRecurringTasksData, recurringTasksData, clientsData] = await Promise.all([
        taskApi.getTasks().catch(e => { console.error(e); return []; }),
        fetchRecurring().catch(e => { console.error(e); return []; }),
        authenticatedFetch('/api/clients').then(r => r.ok ? r.json() : { data: [] }).catch(e => { console.error(e); return { data: [] }; })
      ]);

      setNonRecurringTasks(nonRecurringTasksData);
      setClients(clientsData.data || []);

      // Auto-initialize workflow steps for tasks that have TAR/STAT enabled but empty steps
      const initializedTasks = recurringTasksData.map((task: RecurringTask) => {
        let updated = { ...task };
        if (task.tarEnabled && (!task.tarSteps || task.tarSteps.length === 0)) {
          updated = { ...updated, tarSteps: initializeWorkflowSteps('TAR') };
          if (task.id) {
            authenticatedFetch(`/api/workflow/${task.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workflowType: 'TAR' }),
            }).catch(err => console.error(`Failed to init TAR steps for task ${task.id}:`, err));
          }
        }
        if (task.statEnabled && (!task.statSteps || task.statSteps.length === 0)) {
          updated = { ...updated, statSteps: initializeWorkflowSteps('STAT') };
          if (task.id) {
            authenticatedFetch(`/api/workflow/${task.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ workflowType: 'STAT' }),
            }).catch(err => console.error(`Failed to init STAT steps for task ${task.id}:`, err));
          }
        }
        return updated;
      });

      setRecurringTasks(initializedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, { ...newTask, isRecurring: false }]);
  };

  // Handle workflow task click from calendar event — opens grid modal (not drawer directly)
  const handleWorkflowTaskClick = async (
    task: RecurringTask,
    type: WorkflowType,
    clientId?: string,
    clientName?: string,
  ) => {
    let enrichedTask = { ...task };
    const steps = getStepsForReportType(task, type);

    if (steps.length === 0) {
      // Initialize steps if none exist
      const newSteps = initializeWorkflowSteps(type as 'TAR' | 'STAT');
      enrichedTask = { ...enrichedTask, [type === 'tar' || type === 'TAR' ? 'tarSteps' : 'statSteps']: newSteps };

      if (task.id) {
        authenticatedFetch(`/api/workflow/${task.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowType: type }),
        }).catch(err => console.error(`Failed to init ${type} steps for task ${task.id}:`, err));
      }
    }

    // If called from calendar click (no clientId), show grid modal
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

  // Handle step toggle — per-client
  const handleStepToggle = async (stepId: string, completed: boolean, clientId?: string, remark?: string) => {
    if (!selectedWorkflowTask?.id) return;

    const allSteps = getStepsForReportType(selectedWorkflowTask, selectedWorkflowType);

    // Update clientProgress in local state
    const updatedClientProgress = { ...(selectedWorkflowTask.clientProgress || {}) };
    const existing = updatedClientProgress[clientId || '']
      ? { ...updatedClientProgress[clientId || ''] }
      : {
          completedStepIds: allSteps
            .filter((s) => s.completed)
            .map((s) => s.id),
        };

    const completedStepIds = new Set(existing.completedStepIds || []);
    if (completed) {
      completedStepIds.add(stepId);
    } else {
      completedStepIds.delete(stepId);
    }

    updatedClientProgress[clientId || ''] = {
      completedStepIds: Array.from(completedStepIds),
      completedAt: new Date().toISOString(),
      completedBy: auth.currentUser?.uid,
    };

    // Also update the individual step objects with completedAt, completedBy, and remark
    // so the UI can show "Completed [date] by [name]" immediately
    const now = new Date();
    const updatedSteps = allSteps.map((s) => {
      if (s.id === stepId) {
        const updatedStep = { ...s, completed, completedAt: completed ? now : undefined, completedBy: completed ? auth.currentUser?.uid : undefined };

        // Handle remark: store if provided and step is completed; clear if reopened
        if (remark !== undefined) {
          if (completed && remark.trim()) {
            updatedStep.remark = remark.trim();
            updatedStep.remarkBy = auth.currentUser?.uid;
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

    // Write updated steps back into the task (handles both reportTypes and legacy paths)
    const updatedTask = updateTaskSteps(
      { ...selectedWorkflowTask, clientProgress: updatedClientProgress },
      updatedSteps,
    );

    // Update local state
    setSelectedWorkflowTask(updatedTask);
    setRecurringTasks(prev => prev.map(t =>
      t.id === selectedWorkflowTask.id ? updateTaskSteps({ ...t, clientProgress: updatedClientProgress }, updatedSteps) : t
    ));

    // Persist to API with clientId and remark
    await apiPut(`/api/workflow/${selectedWorkflowTask.id}`, {
      stepId,
      workflowType: selectedWorkflowType,
      completed,
      clientId: clientId || undefined,
      remark,
    });
  };

  // Helper: write updated step objects back into a task (handles both reportTypes and legacy)
  const updateTaskSteps = (task: RecurringTask, updatedSteps: WorkflowStep[]): RecurringTask => {
    const lower = selectedWorkflowType.toLowerCase();
    if (task.reportTypes && task.reportTypes.length > 0) {
      const updatedReportTypes = task.reportTypes.map(rt => {
        if (rt.id === selectedWorkflowType || rt.id === lower) {
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

  // Handle mark all steps complete — per-client
  const handleMarkAllComplete = async (clientId?: string) => {
    if (!selectedWorkflowTask?.id) return;

    const allSteps = getStepsForReportType(selectedWorkflowTask, selectedWorkflowType);

    const allStepIds = allSteps.map((s) => s.id);
    const now = new Date();

    const updatedClientProgress = { ...(selectedWorkflowTask.clientProgress || {}) };
    updatedClientProgress[clientId || ''] = {
      completedStepIds: [...allStepIds],
      completedAt: now.toISOString(),
      completedBy: auth.currentUser?.uid,
    };

    // Also update each step object with completedAt and completedBy
    const updatedSteps = allSteps.map((s) => ({
      ...s,
      completed: true,
      completedAt: now,
      completedBy: auth.currentUser?.uid,
    }));

    const updatedTask = updateTaskSteps(
      { ...selectedWorkflowTask, clientProgress: updatedClientProgress },
      updatedSteps,
    );

    setSelectedWorkflowTask(updatedTask);
    setRecurringTasks(prev => prev.map(t =>
      t.id === selectedWorkflowTask.id ? updateTaskSteps({ ...t, clientProgress: updatedClientProgress }, updatedSteps) : t
    ));

    // Persist each step for this client
    for (const stepId of allStepIds) {
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Compliance Calendar</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">View your recurring compliance tasks</p>
        </div>

        {/* View Toggle - hidden on mobile since auto-detection handles it */}
        <div className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'desktop'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ComputerDesktopIcon className="w-4 h-4" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'mobile'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <DevicePhoneMobileIcon className="w-4 h-4" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'desktop' ? (
        <CalendarView
          tasks={tasks}
          onWorkflowTaskClick={(task: RecurringTask, type: WorkflowType, clientId?: string, clientName?: string) =>
            handleWorkflowTaskClick(task, type, clientId, clientName)
          }
        />
      ) : (
        <MobileCalendarView
          tasks={tasks}
          onWorkflowTaskClick={(task: RecurringTask, type: WorkflowType, clientId?: string, clientName?: string) =>
            handleWorkflowTaskClick(task, type, clientId, clientName)
          }
        />
      )}

      {/* Workflow Grid Modal — shown on calendar event click for TAR/STAT tasks */}
      {gridModalTask && (
        <WorkflowGridModal
          open={workflowGridOpen}
          onClose={() => { setWorkflowGridOpen(false); setGridModalTask(null); }}
          task={gridModalTask}
          tarEntries={tarClientGroups.filter(e => e.task.id === gridModalTask.id)}
          statEntries={statClientGroups.filter(e => e.task.id === gridModalTask.id)}
          onCardUpdate={(task, type, clientId, clientName) => {
            handleWorkflowTaskClick(task, type, clientId, clientName);
          }}
        />
      )}

      {/* Create Task Modal */}
      <TaskCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />

      {/* Workflow Drawer — shows per-client progress */}
      {selectedWorkflowTask && (
        <WorkflowDrawer
          open={workflowDrawerOpen}
          onOpenChange={setWorkflowDrawerOpen}
          taskId={selectedWorkflowTask.id!}
          taskTitle={selectedWorkflowTask.title}
          workflowType={selectedWorkflowType}
          steps={getStepsForReportType(selectedWorkflowTask, selectedWorkflowType)}
          completedStepIds={
            selectedClientId
              ? getClientCompletedStepIds(selectedWorkflowTask, selectedClientId, selectedWorkflowType)
              : []
          }
          assignee={
            selectedClientId
              ? selectedWorkflowTask.teamMemberMappings?.find(m => m.clientIds.includes(selectedClientId))?.userName
              : selectedWorkflowTask.teamMemberMappings?.[0]?.userName || selectedWorkflowTask.createdBy
          }
          clientId={selectedClientId || undefined}
          clientName={selectedClientName || undefined}
          onStepToggle={handleStepToggle}
          onMarkAllComplete={handleMarkAllComplete}
        />
      )}
    </div>
  );
}
