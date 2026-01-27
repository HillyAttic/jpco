/**
 * Activity Service
 * Handles logging and retrieving user activities across the application
 */

import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Activity {
  id?: string;
  type: 'created' | 'updated' | 'completed' | 'deleted' | 'assigned';
  entityType: 'task' | 'employee' | 'client' | 'category' | 'team';
  entityId: string;
  entityTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const ACTIVITIES_COLLECTION = 'activities';

export const activityService = {
  /**
   * Log a new activity
   */
  async logActivity(activity: Omit<Activity, 'id' | 'timestamp'>): Promise<void> {
    try {
      const activityRef = collection(db, ACTIVITIES_COLLECTION);
      await addDoc(activityRef, {
        ...activity,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging should not break the app
    }
  },

  /**
   * Get recent activities
   */
  async getRecentActivities(limitCount: number = 10): Promise<Activity[]> {
    try {
      const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
      const q = query(
        activitiesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          entityTitle: data.entityTitle,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          timestamp: data.timestamp?.toDate() || new Date(),
          metadata: data.metadata,
        } as Activity;
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  },

  /**
   * Get activities for a specific user
   */
  async getUserActivities(userId: string, limitCount: number = 10): Promise<Activity[]> {
    try {
      const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          entityTitle: data.entityTitle,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          timestamp: data.timestamp?.toDate() || new Date(),
          metadata: data.metadata,
        } as Activity;
      });
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
  },

  /**
   * Get activities for a specific entity
   */
  async getEntityActivities(entityType: string, entityId: string): Promise<Activity[]> {
    try {
      const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
      const q = query(
        activitiesRef,
        where('entityType', '==', entityType),
        where('entityId', '==', entityId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          entityTitle: data.entityTitle,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          timestamp: data.timestamp?.toDate() || new Date(),
          metadata: data.metadata,
        } as Activity;
      });
    } catch (error) {
      console.error('Error fetching entity activities:', error);
      return [];
    }
  },
};
