import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MyTask, TaskList } from '@/types/my-tasks.types';

const TASK_LISTS_COLLECTION = 'my_task_lists';
const TASKS_COLLECTION = 'my_tasks';

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

export const myTasksService = {
    // ============ TASK LISTS (HEADS) ============

    async getUserTaskLists(userId: string): Promise<TaskList[]> {
        try {
            const listsRef = collection(db, TASK_LISTS_COLLECTION);
            const q = query(
                listsRef,
                where('userId', '==', userId),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    userId: data.userId,
                    name: data.name,
                    color: data.color,
                    order: data.order ?? 0,
                    createdAt: convertTimestamp(data.createdAt),
                    updatedAt: convertTimestamp(data.updatedAt),
                } as TaskList;
            });
        } catch (error) {
            console.error('Error fetching task lists:', error);
            throw error;
        }
    },

    async createTaskList(
        userId: string,
        listData: { name: string; color: string; order: number }
    ): Promise<TaskList> {
        try {
            const listRef = doc(collection(db, TASK_LISTS_COLLECTION));
            const now = new Date();
            const newList: TaskList = {
                id: listRef.id,
                userId,
                name: listData.name,
                color: listData.color,
                order: listData.order,
                createdAt: now,
                updatedAt: now,
            };

            await setDoc(listRef, {
                ...newList,
                createdAt: toTimestamp(now),
                updatedAt: toTimestamp(now),
            });

            return newList;
        } catch (error) {
            console.error('Error creating task list:', error);
            throw error;
        }
    },

    async updateTaskList(
        listId: string,
        updates: Partial<Pick<TaskList, 'name' | 'color' | 'order'>>
    ): Promise<void> {
        try {
            const listRef = doc(db, TASK_LISTS_COLLECTION, listId);
            await updateDoc(listRef, {
                ...updates,
                updatedAt: toTimestamp(new Date()),
            });
        } catch (error) {
            console.error('Error updating task list:', error);
            throw error;
        }
    },

    async deleteTaskList(listId: string, userId: string): Promise<void> {
        try {
            // First, get all tasks for this list that belong to the user
            const tasksRef = collection(db, TASKS_COLLECTION);
            const q = query(
                tasksRef, 
                where('listId', '==', listId),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);

            // Delete tasks individually to ensure proper permission checks
            const deletePromises = snapshot.docs.map(docSnap => 
                deleteDoc(docSnap.ref)
            );
            await Promise.all(deletePromises);

            // Finally, delete the list itself
            const listRef = doc(db, TASK_LISTS_COLLECTION, listId);
            await deleteDoc(listRef);
        } catch (error) {
            console.error('Error deleting task list:', error);
            throw error;
        }
    },

    // ============ TASKS ============

    async getTasksByList(listId: string): Promise<MyTask[]> {
        try {
            const tasksRef = collection(db, TASKS_COLLECTION);
            const q = query(
                tasksRef,
                where('listId', '==', listId),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    listId: data.listId,
                    userId: data.userId,
                    title: data.title,
                    notes: data.notes || '',
                    completed: data.completed ?? false,
                    dueDate: data.dueDate ? convertTimestamp(data.dueDate) : null,
                    order: data.order ?? 0,
                    createdAt: convertTimestamp(data.createdAt),
                    updatedAt: convertTimestamp(data.updatedAt),
                } as MyTask;
            });
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    },

    async getAllUserTasks(userId: string): Promise<MyTask[]> {
        try {
            const tasksRef = collection(db, TASKS_COLLECTION);
            const q = query(
                tasksRef,
                where('userId', '==', userId),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    listId: data.listId,
                    userId: data.userId,
                    title: data.title,
                    notes: data.notes || '',
                    completed: data.completed ?? false,
                    dueDate: data.dueDate ? convertTimestamp(data.dueDate) : null,
                    order: data.order ?? 0,
                    createdAt: convertTimestamp(data.createdAt),
                    updatedAt: convertTimestamp(data.updatedAt),
                } as MyTask;
            });
        } catch (error) {
            console.error('Error fetching all user tasks:', error);
            throw error;
        }
    },

    async createTask(taskData: {
        listId: string;
        userId: string;
        title: string;
        notes?: string;
        dueDate?: Date | null;
        order: number;
    }): Promise<MyTask> {
        try {
            const taskRef = doc(collection(db, TASKS_COLLECTION));
            const now = new Date();
            const newTask: MyTask = {
                id: taskRef.id,
                listId: taskData.listId,
                userId: taskData.userId,
                title: taskData.title,
                notes: taskData.notes || '',
                completed: false,
                dueDate: taskData.dueDate || null,
                order: taskData.order,
                createdAt: now,
                updatedAt: now,
            };

            const firestoreData: any = {
                ...newTask,
                createdAt: toTimestamp(now),
                updatedAt: toTimestamp(now),
            };

            if (newTask.dueDate) {
                firestoreData.dueDate = toTimestamp(newTask.dueDate);
            } else {
                firestoreData.dueDate = null;
            }

            await setDoc(taskRef, firestoreData);
            return newTask;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },

    async updateTask(
        taskId: string,
        updates: Partial<Pick<MyTask, 'title' | 'notes' | 'completed' | 'dueDate' | 'order' | 'listId'>>
    ): Promise<void> {
        try {
            const taskRef = doc(db, TASKS_COLLECTION, taskId);
            const updateData: any = {
                ...updates,
                updatedAt: toTimestamp(new Date()),
            };

            // Convert dueDate to Firestore timestamp if present
            if (updateData.dueDate !== undefined) {
                updateData.dueDate = updateData.dueDate
                    ? toTimestamp(updateData.dueDate)
                    : null;
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
