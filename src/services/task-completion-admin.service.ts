/**
 * Task Completion Admin Service
 * Server-side service for managing task completions using Firebase Admin SDK
 */

import { adminDb } from '@/lib/firebase-admin';
import { ClientTaskCompletion } from './task-completion.service';

/**
 * Task Completion Admin Service API
 */
export const taskCompletionAdminService = {
  /**
   * Get all completions for a specific recurring task
   */
  async getByTaskId(recurringTaskId: string): Promise<ClientTaskCompletion[]> {
    try {
      const snapshot = await adminDb
        .collection('task-completions')
        .where('recurringTaskId', '==', recurringTaskId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ClientTaskCompletion[];
    } catch (error) {
      console.error('[Task Completion Admin] Error getting by task ID:', error);
      throw error;
    }
  },

  /**
   * Get completions for a specific client and task
   */
  async getByClientAndTask(clientId: string, recurringTaskId: string): Promise<ClientTaskCompletion[]> {
    try {
      const snapshot = await adminDb
        .collection('task-completions')
        .where('clientId', '==', clientId)
        .where('recurringTaskId', '==', recurringTaskId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as ClientTaskCompletion[];
    } catch (error) {
      console.error('[Task Completion Admin] Error getting by client and task:', error);
      throw error;
    }
  },

  /**
   * Create or update a task completion
   */
  async createOrUpdate(data: Omit<ClientTaskCompletion, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientTaskCompletion> {
    try {
      // Check if completion already exists
      const existingSnapshot = await adminDb
        .collection('task-completions')
        .where('recurringTaskId', '==', data.recurringTaskId)
        .where('clientId', '==', data.clientId)
        .where('monthKey', '==', data.monthKey)
        .limit(1)
        .get();

      const now = new Date();
      
      // Prepare data for Firestore (convert Date objects to Firestore Timestamps)
      const firestoreData = {
        recurringTaskId: data.recurringTaskId,
        clientId: data.clientId,
        monthKey: data.monthKey,
        isCompleted: data.isCompleted,
        completedAt: data.completedAt || null,
        completedBy: data.completedBy || null,
        arnNumber: data.arnNumber || null,
        arnName: data.arnName || null,
      };

      if (!existingSnapshot.empty) {
        // Update existing
        const docRef = existingSnapshot.docs[0].ref;
        await docRef.update({
          ...firestoreData,
          updatedAt: now,
        });

        const updated = await docRef.get();
        return {
          id: updated.id,
          ...updated.data(),
          completedAt: updated.data()?.completedAt?.toDate?.() || updated.data()?.completedAt,
          createdAt: updated.data()?.createdAt?.toDate?.() || updated.data()?.createdAt,
          updatedAt: now,
        } as ClientTaskCompletion;
      } else {
        // Create new
        const docRef = await adminDb.collection('task-completions').add({
          ...firestoreData,
          createdAt: now,
          updatedAt: now,
        });

        const created = await docRef.get();
        return {
          id: created.id,
          ...created.data(),
          completedAt: created.data()?.completedAt?.toDate?.() || created.data()?.completedAt,
          createdAt: now,
          updatedAt: now,
        } as ClientTaskCompletion;
      }
    } catch (error) {
      console.error('[Task Completion Admin] Error creating/updating:', error);
      throw error;
    }
  },

  /**
   * Delete a task completion
   */
  async delete(id: string): Promise<void> {
    try {
      await adminDb.collection('task-completions').doc(id).delete();
    } catch (error) {
      console.error('[Task Completion Admin] Error deleting:', error);
      throw error;
    }
  },
};
