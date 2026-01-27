import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { KanbanTask, Business } from '@/types/kanban.types';

const BUSINESSES_COLLECTION = 'kanban_businesses';
const TASKS_COLLECTION = 'kanban_tasks';

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Convert Date to Firestore timestamp
const toTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

export const kanbanService = {
  // ============ BUSINESSES ============
  
  async getUserBusinesses(userId: string): Promise<Business[]> {
    try {
      const businessesRef = collection(db, BUSINESSES_COLLECTION);
      const q = query(businessesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          color: data.color,
          createdAt: convertTimestamp(data.createdAt),
          userId: data.userId,
        } as Business;
      });
    } catch (error) {
      console.error('Error fetching businesses:', error);
      throw error;
    }
  },

  async createBusiness(userId: string, businessData: Omit<Business, 'id' | 'createdAt'>): Promise<Business> {
    try {
      const businessRef = doc(collection(db, BUSINESSES_COLLECTION));
      const newBusiness: Business = {
        ...businessData,
        id: businessRef.id,
        createdAt: new Date(),
      };

      await setDoc(businessRef, {
        ...newBusiness,
        userId,
        createdAt: toTimestamp(newBusiness.createdAt),
      });

      return newBusiness;
    } catch (error) {
      console.error('Error creating business:', error);
      throw error;
    }
  },

  async updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
    try {
      const businessRef = doc(db, BUSINESSES_COLLECTION, businessId);
      const updateData: any = { ...updates };
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.userId;

      await updateDoc(businessRef, updateData);
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  },

  async deleteBusiness(businessId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Delete business
      const businessRef = doc(db, BUSINESSES_COLLECTION, businessId);
      batch.delete(businessRef);
      
      // Delete all tasks for this business
      const tasksRef = collection(db, TASKS_COLLECTION);
      const q = query(tasksRef, where('businessId', '==', businessId));
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  },

  // ============ TASKS ============
  
  async getBusinessTasks(businessId: string): Promise<KanbanTask[]> {
    try {
      const tasksRef = collection(db, TASKS_COLLECTION);
      const q = query(tasksRef, where('businessId', '==', businessId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          title: data.title,
          description: data.description,
          status: data.status,
          dueDate: convertTimestamp(data.dueDate),
          priority: data.priority,
          commentsCount: data.commentsCount || 0,
          attachmentsCount: data.attachmentsCount || 0,
          assignee: data.assignee,
          tags: data.tags || [],
          createdAt: convertTimestamp(data.createdAt),
        } as KanbanTask;
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  async getAllUserTasks(userId: string): Promise<KanbanTask[]> {
    try {
      // First get all user's businesses
      const businesses = await this.getUserBusinesses(userId);
      const businessIds = businesses.map(b => b.id);
      
      if (businessIds.length === 0) return [];
      
      // Fetch tasks for all businesses
      const tasksRef = collection(db, TASKS_COLLECTION);
      const q = query(tasksRef, where('businessId', 'in', businessIds));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          businessId: data.businessId,
          title: data.title,
          description: data.description,
          status: data.status,
          dueDate: convertTimestamp(data.dueDate),
          priority: data.priority,
          commentsCount: data.commentsCount || 0,
          attachmentsCount: data.attachmentsCount || 0,
          assignee: data.assignee,
          tags: data.tags || [],
          createdAt: convertTimestamp(data.createdAt),
        } as KanbanTask;
      });
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      throw error;
    }
  },

  async createTask(taskData: Omit<KanbanTask, 'id' | 'createdAt'>): Promise<KanbanTask> {
    try {
      const taskRef = doc(collection(db, TASKS_COLLECTION));
      const newTask: KanbanTask = {
        ...taskData,
        id: taskRef.id,
        createdAt: new Date(),
      };

      await setDoc(taskRef, {
        ...newTask,
        dueDate: toTimestamp(newTask.dueDate),
        createdAt: toTimestamp(newTask.createdAt),
      });

      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  async updateTask(taskId: string, updates: Partial<KanbanTask>): Promise<void> {
    try {
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      const updateData: any = { ...updates };
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      
      // Convert dates to timestamps
      if (updateData.dueDate) {
        updateData.dueDate = toTimestamp(updateData.dueDate);
      }

      await updateDoc(taskRef, updateData);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },
};
