/**
 * Recurring Task Admin Service
 * Server-side service using Firebase Admin SDK for recurring task operations
 */

import { createAdminService } from './admin-base.service';
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

export type WorkflowType = string;

/** Dynamic report type configuration stored on each RecurringTask */
export interface ReportTypeConfig {
  id: string;           // Unique stable ID (e.g., 'tar', 'stat', 'custom-1')
  name: string;         // Display name (e.g., "TAR Reports")
  badgeLabel: string;   // Badge text (e.g., "TAX")
  badgeClass: string;   // Tailwind badge classes
  description: string;  // Short description (e.g., "Tax Audit Report")
  enabled: boolean;     // Whether active
  steps: WorkflowStep[]; // Workflow step definitions
}

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
  /** Dynamic report type configurations (overrides legacy tarEnabled/statEnabled when present) */
  reportTypes?: ReportTypeConfig[];
  /** Per-client progress: clientId -> { completedStepIds, completedAt, completedBy } */
  clientProgress?: Record<string, ClientWorkflowProgress>;
  /** Compliance filter for dynamic client tracking (e.g. 'taxAudit', 'itr', 'statutoryAudit') */
  clientFilter?: 'all' | 'roc' | 'gstr1' | 'gst3b' | 'iff' | 'itr' | 'itrAudit' | 'taxAudit' | 'accounting' | 'clientVisit' | 'bank' | 'tcs' | 'tds' | 'statutoryAudit';
  /** Whether to show unassigned clients in the reports modal */
  showUnassignedClients?: boolean;
  createdBy?: string; // User ID of the creator
  createdAt?: Date;
  updatedAt?: Date;
}

// Create base admin service
const baseService = createAdminService<RecurringTask>('recurring-tasks');

/**
 * Recurring Task Admin Service - Server-side only
 */
export const recurringTaskAdminService = {
  ...baseService,

  /**
   * Create a new recurring task
   */
  async create(
    data: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringTask> {
    return await baseService.create(data);
  },

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
    const options: any = {
      filters: [],
    };

    // Add status filter
    if (filters?.status) {
      options.filters.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add priority filter
    if (filters?.priority) {
      options.filters.push({
        field: 'priority',
        operator: '==',
        value: filters.priority,
      });
    }

    // Add category filter
    if (filters?.category) {
      options.filters.push({
        field: 'categoryId',
        operator: '==',
        value: filters.category,
      });
    }

    // Add paused filter
    if (filters?.isPaused !== undefined) {
      options.filters.push({
        field: 'isPaused',
        operator: '==',
        value: filters.isPaused,
      });
    }

    // Add limit
    if (filters?.limit) {
      options.limit = filters.limit;
    }

    // Add default ordering by dueDate
    options.orderBy = {
      field: 'dueDate',
      direction: 'asc' as const,
    };

    let tasks = await baseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    return tasks;
  },

  /**
   * Pause a recurring task
   */
  async pause(id: string): Promise<RecurringTask> {
    return await baseService.update(id, { isPaused: true });
  },

  /**
   * Resume a recurring task
   */
  async resume(id: string): Promise<RecurringTask> {
    return await baseService.update(id, { isPaused: false });
  },

  /**
   * Complete a cycle and schedule next occurrence
   */
  async completeCycle(id: string, completedBy: string, arnNumber?: string, arnName?: string): Promise<RecurringTask> {
    const task = await baseService.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Add to completion history
    const newCompletionRecord: CompletionRecord = {
      date: new Date(),
      completedBy,
      arnNumber,
      arnName,
    };

    const updatedHistory = [...task.completionHistory, newCompletionRecord];

    // Calculate next occurrence from current dueDate
    const nextDueDate = calculateNextOccurrence(
      task.dueDate,
      task.recurrencePattern
    );

    // Update task with new due date and history
    return await baseService.update(id, {
      dueDate: nextDueDate,
      completionHistory: updatedHistory,
      status: 'pending',
    });
  },

  /**
   * Get completion rate for a recurring task
   */
  async getCompletionRate(id: string): Promise<number> {
    const task = await baseService.getById(id);
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
