/**
 * Recurring Task Admin Service
 * Server-side service using Firebase Admin SDK for recurring task operations
 */

import { createAdminService } from './admin-base.service';

export interface RecurringTask {
  id?: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time?: string;
  assignedTo: string[];
  categoryId?: string;
  contactId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  lastCompletedAt?: Date;
  nextDueDate?: Date;
  completionCount: number;
  createdBy: string;
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
   * Get all recurring tasks with filters
   */
  async getAll(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
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

    // Add assignedTo filter
    if (filters?.assignedTo) {
      options.filters.push({
        field: 'assignedTo',
        operator: 'array-contains',
        value: filters.assignedTo,
      });
    }

    // Add limit
    if (filters?.limit) {
      options.limit = filters.limit;
    }

    // Add default ordering
    options.orderBy = {
      field: 'createdAt',
      direction: 'desc' as const,
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
    return await baseService.update(id, {
      status: 'paused',
    });
  },

  /**
   * Resume a recurring task
   */
  async resume(id: string): Promise<RecurringTask> {
    return await baseService.update(id, {
      status: 'active',
    });
  },

  /**
   * Complete a recurring task
   */
  async complete(id: string): Promise<RecurringTask> {
    const task = await baseService.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    return await baseService.update(id, {
      status: 'completed',
      lastCompletedAt: new Date(),
      completionCount: task.completionCount + 1,
    });
  },
};
