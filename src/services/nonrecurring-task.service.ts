/**
 * Non-Recurring Task Service
 * Handles all non-recurring task-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';

export interface NonRecurringTask {
  id?: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'pending' | 'in-progress' | 'completed';
  assignedTo: string[]; // Array of employee IDs
  categoryId?: string; // Category ID reference
  contactId?: string; // Client ID reference
  createdBy?: string; // User ID of the creator
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the Firebase service instance for non-recurring tasks
const taskFirebaseService = createFirebaseService<NonRecurringTask>('tasks');

/**
 * Non-Recurring Task Service API
 */
export const nonRecurringTaskService = {
  /**
   * Get all tasks with optional filters
   */
  async getAll(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<NonRecurringTask[]> {
    const options: QueryOptions = {
      filters: [],
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
        field: 'category',
        operator: '==',
        value: filters.category,
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

    let tasks = await taskFirebaseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      tasks = await taskFirebaseService.searchMultipleFields(
        ['title', 'description', 'category'],
        filters.search,
        options
      );
    }

    return tasks;
  },

  /**
   * Get a task by ID
   */
  async getById(id: string): Promise<NonRecurringTask | null> {
    return taskFirebaseService.getById(id);
  },

  /**
   * Create a new task
   */
  async create(
    data: Omit<NonRecurringTask, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NonRecurringTask> {
    const task = await taskFirebaseService.create(data);

    // Send push notifications to assigned users
    if (data.assignedTo && data.assignedTo.length > 0) {
      try {
        const { pushNotificationService } = await import('./push-notification.service');
        await pushNotificationService.notifyTaskAssignments(
          data.assignedTo,
          data.title,
          task.id!,
          false
        );
      } catch (error) {
        console.error('Error sending task assignment notifications:', error);
      }
    }

    return task;
  },

  /**
   * Update a task
   */
  async update(
    id: string,
    data: Partial<Omit<NonRecurringTask, 'id'>>
  ): Promise<NonRecurringTask> {
    const task = await taskFirebaseService.update(id, data);

    // Send push notifications if new users are assigned
    if (data.assignedTo && data.assignedTo.length > 0) {
      try {
        const { pushNotificationService } = await import('./push-notification.service');
        await pushNotificationService.notifyTaskAssignments(
          data.assignedTo,
          data.title || task.title,
          id,
          false
        );
      } catch (error) {
        console.error('Error sending task assignment notifications:', error);
      }
    }

    return task;
  },

  /**
   * Delete a task
   */
  async delete(id: string): Promise<void> {
    return taskFirebaseService.delete(id);
  },

  /**
   * Toggle task completion
   */
  async toggleComplete(id: string): Promise<NonRecurringTask> {
    const task = await taskFirebaseService.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    return taskFirebaseService.update(id, { status: newStatus });
  },

  /**
   * Get overdue tasks
   */
  async getOverdue(): Promise<NonRecurringTask[]> {
    const now = new Date();
    const tasks = await taskFirebaseService.getAll({
      filters: [
        {
          field: 'status',
          operator: '!=',
          value: 'completed',
        },
      ],
    });

    return tasks.filter((task) => task.dueDate < now);
  },

  /**
   * Get task statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    const allTasks = await taskFirebaseService.getAll();
    const now = new Date();

    return {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'pending').length,
      inProgress: allTasks.filter((t) => t.status === 'in-progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      overdue: allTasks.filter(
        (t) => t.status !== 'completed' && t.dueDate < now
      ).length,
    };
  },
};
