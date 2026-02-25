/**
 * Non-Recurring Task Admin Service
 * Server-side service using Firebase Admin SDK for API routes
 */

import { adminDb } from '@/lib/firebase-admin';
import { NonRecurringTask } from './nonrecurring-task.service';
import { Comment } from '@/types/task.types';

/**
 * Non-Recurring Task Admin Service API
 * Uses Firebase Admin SDK for server-side operations
 */
export const nonRecurringTaskAdminService = {
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
    let query = adminDb.collection('tasks');

    // Add status filter
    if (filters?.status) {
      query = query.where('status', '==', filters.status) as any;
    }

    // Add priority filter
    if (filters?.priority) {
      query = query.where('priority', '==', filters.priority) as any;
    }

    // Add category filter
    if (filters?.category) {
      query = query.where('category', '==', filters.category) as any;
    }

    // Add ordering
    query = query.orderBy('dueDate', 'asc') as any;

    // Add limit
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    const snapshot = await query.get();
    let tasks: NonRecurringTask[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as NonRecurringTask));

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(task =>
        task.title?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    return tasks;
  },

  /**
   * Get a task by ID
   */
  async getById(id: string): Promise<NonRecurringTask | null> {
    const doc = await adminDb.collection('tasks').doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data()?.dueDate?.toDate() || new Date(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as NonRecurringTask;
  },

  /**
   * Create a new task
   */
  async create(
    data: Omit<NonRecurringTask, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NonRecurringTask> {
    const now = new Date();
    const taskData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('tasks').add(taskData);

    // Return the data we already have — no need for an extra Firestore read
    return {
      id: docRef.id,
      ...data,
      dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate as any),
      createdAt: now,
      updatedAt: now,
    } as NonRecurringTask;
  },

  /**
   * Update a task
   */
  async update(
    id: string,
    data: Partial<Omit<NonRecurringTask, 'id'>>
  ): Promise<NonRecurringTask> {
    const now = new Date();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    await adminDb.collection('tasks').doc(id).update(updateData);

    // Return merged data — no need for extra Firestore read after update
    return {
      id,
      ...data,
      updatedAt: now,
    } as NonRecurringTask;
  },

  /**
   * Delete a task
   */
  async delete(id: string): Promise<void> {
    await adminDb.collection('tasks').doc(id).delete();
  },

  /**
   * Toggle task completion status
   */
  async toggleComplete(id: string): Promise<NonRecurringTask> {
    const task = await this.getById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    return this.update(id, { status: newStatus });
  },

  /**
   * Add a comment to a task
   */
  async addComment(taskId: string, comment: Omit<Comment, 'id' | 'taskId' | 'createdAt'>): Promise<Comment> {
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const commentData = {
      ...comment,
      taskId,
      createdAt: new Date(),
    };

    const commentRef = await taskRef.collection('comments').add(commentData);

    // Update comment count on task (optional, but good for UI)
    // await taskRef.update({ 
    //   commentCount: admin.firestore.FieldValue.increment(1) 
    // });

    return {
      id: commentRef.id,
      ...commentData,
    };
  },

  /**
   * Get comments for a task
   */
  async getComments(taskId: string): Promise<Comment[]> {
    const commentsSnapshot = await adminDb
      .collection('tasks')
      .doc(taskId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .get();

    return commentsSnapshot.docs.map(doc => ({
      id: doc.id,
      taskId,
      author: doc.data().author,
      content: doc.data().content,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
  },
};
