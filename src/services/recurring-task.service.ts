/**
 * Recurring Task Service
 * Handles all recurring task-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import { calculateNextOccurrence } from '@/utils/recurrence-scheduler';

export interface CompletionRecord {
  date: Date;
  completedBy: string;
  arnNumber?: string; // ARN number if ARN is enabled
  arnName?: string; // Name of person who provided ARN
  remark?: string; // Remark text if remarks are enabled
  remarkBy?: string; // Name of person who provided remark
}

export interface TeamMemberMapping {
  userId: string;
  userName: string;
  clientIds: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  shortName: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

/** Per-client workflow progress — stored under clientProgress[clientId] */
export interface ClientWorkflowProgress {
  completedStepIds: string[];
  completedAt?: string; // ISO date string
  completedBy?: string; // user UID
}

export type WorkflowType = 'TAR' | 'STAT';

export interface RecurringTask {
  id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  contactIds: string[]; // Array of contact IDs
  categoryId?: string; // Category ID
  recurrencePattern: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  dueDate: Date; // Next due date (replaces nextOccurrence)
  startDate: Date;
  completionHistory: CompletionRecord[];
  isPaused: boolean;
  teamId?: string; // Team ID
  teamMemberMappings?: TeamMemberMapping[]; // Team member to client mappings
  requiresArn?: boolean; // Whether ARN is required for completion
  requiresRemark?: boolean; // Whether remark is required for completion
  // TAR/STAT workflow fields
  tarEnabled?: boolean; // Whether TAR (Tax Audit Report) workflow is enabled
  statEnabled?: boolean; // Whether STAT (Statutory Audit) workflow is enabled
  tarSteps?: WorkflowStep[]; // TAR workflow step definitions (7 steps)
  statSteps?: WorkflowStep[]; // STAT workflow step definitions (10 steps)
  /** Per-client progress: clientId -> { completedStepIds, completedAt, completedBy } */
  clientProgress?: Record<string, ClientWorkflowProgress>;
  createdBy?: string; // User ID of the creator
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the Firebase service instance for recurring tasks
const recurringTaskFirebaseService = createFirebaseService<RecurringTask>('recurring-tasks');

/**
 * Recurring Task Service API
 */
export const recurringTaskService = {
  /**
   * Get all recurring tasks with optional filters
   */
  async getAll(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    isPaused?: boolean;
    search?: string;
    limit?: number;
  }): Promise<RecurringTask[]> {
    const options: QueryOptions & { forceServerFetch?: boolean } = {
      filters: [],
      forceServerFetch: false, // OPTIMIZED: Use cache to reduce reads
    };

    // Add status filter
    if (filters?.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add priority filter
    if (filters?.priority) {
      options.filters!.push({
        field: 'priority',
        operator: '==',
        value: filters.priority,
      });
    }

    // Add category filter
    if (filters?.category) {
      options.filters!.push({
        field: 'categoryId',
        operator: '==',
        value: filters.category,
      });
    }

    // Add paused filter
    if (filters?.isPaused !== undefined) {
      options.filters!.push({
        field: 'isPaused',
        operator: '==',
        value: filters.isPaused,
      });
    }

    // Add pagination
    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'dueDate';
    options.orderDirection = 'asc';

    let tasks = await recurringTaskFirebaseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      tasks = await recurringTaskFirebaseService.searchMultipleFields(
        ['title', 'description'],
        filters.search,
        options
      );
    }

    return tasks;
  },

  /**
   * Get a recurring task by ID
   */
  async getById(id: string): Promise<RecurringTask | null> {
    return recurringTaskFirebaseService.getById(id);
  },

  /**
   * Create a new recurring task
   */
  async create(
    data: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'completionHistory' | 'isPaused'>
  ): Promise<RecurringTask> {
    const task = await recurringTaskFirebaseService.create({
      ...data,
      completionHistory: [],
      isPaused: false,
    });
    
    // Send push notifications to team members
    if (data.teamMemberMappings && data.teamMemberMappings.length > 0) {
      try {
        const { pushNotificationService } = await import('./push-notification.service');
        const userIds = data.teamMemberMappings.map(m => m.userId);
        await pushNotificationService.notifyTaskAssignments(
          userIds,
          data.title,
          task.id!,
          true
        );
      } catch (error) {
        console.error('Error sending recurring task assignment notifications:', error);
      }
    }
    
    return task;
  },

  /**
   * Update a recurring task
   */
  async update(
    id: string,
    data: Partial<Omit<RecurringTask, 'id'>>
  ): Promise<RecurringTask> {
    const task = await recurringTaskFirebaseService.update(id, data);
    
    // Send push notifications if team members are updated
    if (data.teamMemberMappings && data.teamMemberMappings.length > 0) {
      try {
        const { pushNotificationService } = await import('./push-notification.service');
        const userIds = data.teamMemberMappings.map(m => m.userId);
        await pushNotificationService.notifyTaskAssignments(
          userIds,
          data.title || task.title,
          id,
          true
        );
      } catch (error) {
        console.error('Error sending recurring task assignment notifications:', error);
      }
    }
    
    return task;
  },

  /**
   * Delete a recurring task
   */
  async delete(id: string): Promise<void> {
    return recurringTaskFirebaseService.delete(id);
  },

  /**
   * Pause a recurring task
   */
  async pause(id: string): Promise<RecurringTask> {
    return recurringTaskFirebaseService.update(id, { isPaused: true });
  },

  /**
   * Resume a recurring task
   */
  async resume(id: string): Promise<RecurringTask> {
    return recurringTaskFirebaseService.update(id, { isPaused: false });
  },

  /**
   * Complete a cycle and schedule next occurrence
   */
  async completeCycle(id: string, completedBy: string): Promise<RecurringTask> {
    const task = await recurringTaskFirebaseService.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Add to completion history
    const newCompletionRecord: CompletionRecord = {
      date: new Date(),
      completedBy,
    };

    const updatedHistory = [...task.completionHistory, newCompletionRecord];

    // Calculate next occurrence
    const nextOccurrence = calculateNextOccurrence(
      task.dueDate,
      task.recurrencePattern
    );

    // Update task with new occurrence and history
    return recurringTaskFirebaseService.update(id, {
      dueDate: nextOccurrence,
      completionHistory: updatedHistory,
      status: 'pending',
    });
  },

  /**
   * Get completion rate for a recurring task
   */
  async getCompletionRate(id: string): Promise<number> {
    const task = await recurringTaskFirebaseService.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const totalCycles = this.calculateTotalCycles(
      task.startDate,
      task.dueDate,
      task.recurrencePattern
    );

    if (totalCycles === 0) return 0;

    return (task.completionHistory.length / totalCycles) * 100;
  },

  /**
   * Calculate total cycles between start and current date
   */
  calculateTotalCycles(
    startDate: Date,
    currentDate: Date,
    pattern: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  ): number {
    const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (pattern) {
      case 'monthly':
        return Math.floor(diffDays / 30);
      case 'quarterly':
        return Math.floor(diffDays / 90);
      case 'half-yearly':
        return Math.floor(diffDays / 180);
      case 'yearly':
        return Math.floor(diffDays / 365);
      default:
        return 0;
    }
  },
};

// ─────────────────────────────────────────────
// Per-client workflow progress helpers
// ─────────────────────────────────────────────

/**
 * Get the completed step IDs for a specific client.
 * Falls back to legacy task-level steps if clientProgress is not yet populated.
 */
export function getClientCompletedStepIds(
  task: RecurringTask,
  clientId: string,
  workflowType: WorkflowType
): string[] {
  const key = workflowType === 'TAR' ? 'tarSteps' : 'statSteps';
  const legacySteps = task[key] || [];

  // If clientProgress exists for this client, use it
  if (task.clientProgress?.[clientId]) {
    return task.clientProgress[clientId].completedStepIds || [];
  }

  // Migration fallback: derive from legacy task-level steps
  // All clients share the same legacy progress until they diverge
  return legacySteps.filter((s) => s.completed).map((s) => s.id);
}

/**
 * Check if a specific step is completed for a specific client.
 */
export function isStepCompletedForClient(
  task: RecurringTask,
  stepId: string,
  clientId: string,
  workflowType: WorkflowType
): boolean {
  return getClientCompletedStepIds(task, clientId, workflowType).includes(stepId);
}

/**
 * Calculate per-client progress percentage.
 */
export function calculateClientProgressPercent(
  task: RecurringTask,
  clientId: string,
  workflowType: WorkflowType
): number {
  const key = workflowType === 'TAR' ? 'tarSteps' : 'statSteps';
  const totalSteps = (task[key] || []).length;
  if (totalSteps === 0) return 0;
  const completed = getClientCompletedStepIds(task, clientId, workflowType).length;
  return Math.round((completed / totalSteps) * 100);
}

/**
 * Get per-client workflow status.
 */
export function getClientWorkflowStatus(
  task: RecurringTask,
  clientId: string,
  workflowType: WorkflowType
): 'completed' | 'in-progress' | 'pending' {
  const key = workflowType === 'TAR' ? 'tarSteps' : 'statSteps';
  const totalSteps = (task[key] || []).length;
  if (totalSteps === 0) return 'pending';
  const completed = getClientCompletedStepIds(task, clientId, workflowType).length;
  if (completed === totalSteps) return 'completed';
  if (completed > 0) return 'in-progress';
  return 'pending';
}

/**
 * Build an updated task with a toggled step for a specific client.
 * Initializes clientProgress from legacy steps on first touch.
 */
export function updateClientStepProgress(
  task: RecurringTask,
  stepId: string,
  completed: boolean,
  clientId: string,
  workflowType: WorkflowType,
  userUid: string | undefined
): RecurringTask {
  const key = workflowType === 'TAR' ? 'tarSteps' : 'statSteps';
  const totalSteps = task[key] || [];

  // Build clientProgress if not present
  const clientProgress = { ...(task.clientProgress || {}) };
  const existing = clientProgress[clientId]
    ? { ...clientProgress[clientId] }
    : {
        completedStepIds: totalSteps.filter((s) => s.completed).map((s) => s.id),
      };

  const completedStepIds = new Set(existing.completedStepIds || []);

  if (completed) {
    completedStepIds.add(stepId);
  } else {
    completedStepIds.delete(stepId);
  }

  clientProgress[clientId] = {
    completedStepIds: Array.from(completedStepIds),
    completedAt: new Date().toISOString(),
    completedBy: userUid,
  };

  return { ...task, clientProgress };
}

/**
 * Get a per-client progress summary compatible with calculateWorkflowProgress shape.
 */
export function getClientProgressSummary(
  task: RecurringTask,
  clientId: string,
  workflowType: WorkflowType
): {
  total: number;
  completed: number;
  percentage: number;
  status: 'pending' | 'in-progress' | 'completed';
} {
  const key = workflowType === 'TAR' ? 'tarSteps' : 'statSteps';
  const total = (task[key] || []).length;
  const completed = getClientCompletedStepIds(task, clientId, workflowType).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  let status: 'pending' | 'in-progress' | 'completed' = 'pending';
  if (completed === total && total > 0) {
    status = 'completed';
  } else if (completed > 0) {
    status = 'in-progress';
  }

  return { total, completed, percentage, status };
}
