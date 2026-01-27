import { useState, useEffect, useCallback } from 'react';
import { NonRecurringTask } from '@/services/nonrecurring-task.service';

interface UseTasksOptions {
  initialFetch?: boolean;
}

interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
}

interface UseTasksReturn {
  tasks: NonRecurringTask[];
  loading: boolean;
  error: Error | null;
  createTask: (data: Omit<NonRecurringTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Omit<NonRecurringTask, 'id'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  searchTasks: (query: string) => void;
  filterTasks: (filters: TaskFilters) => void;
}

/**
 * Custom hook for managing non-recurring tasks with CRUD operations and optimistic updates
 * Validates Requirements: 2.7, 2.8, 9.3, 9.4
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { initialFetch = true } = options;

  const [tasks, setTasks] = useState<NonRecurringTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<TaskFilters>({});

  /**
   * Helper function to get authentication token
   */
  const getAuthToken = async (): Promise<string> => {
    const { auth } = await import('@/lib/firebase');
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    return await user.getIdToken();
  };

  /**
   * Fetch tasks from API with authentication
   */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const result = await response.json();
      setTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (initialFetch) {
      fetchTasks();
    }
  }, [initialFetch, fetchTasks]);

  /**
   * Create a new task with optimistic update and authentication
   * Validates Requirements: 9.3
   */
  const createTask = useCallback(
    async (data: Omit<NonRecurringTask, 'id' | 'createdAt' | 'updatedAt'>) => {
      const token = await getAuthToken();

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticTask: NonRecurringTask = {
        ...data,
        id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistic update - add task immediately
      setTasks((prev) => [optimisticTask, ...prev]);

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create task');
        }

        const newTask = await response.json();

        // Replace optimistic task with real task
        setTasks((prev) =>
          prev.map((task) => (task.id === tempId ? newTask : task))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setTasks((prev) => prev.filter((task) => task.id !== tempId));
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Update an existing task with optimistic update
   */
  const updateTask = useCallback(
    async (id: string, data: Partial<Omit<NonRecurringTask, 'id'>>) => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Optimistic update - update task immediately
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, ...data, updatedAt: new Date() }
            : task
        )
      );

      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update task');
        }

        const updatedTask = await response.json();

        // Replace optimistic update with server response
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? originalTask : task))
        );
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [tasks]
  );

  /**
   * Delete a task with optimistic update
   * Validates Requirements: 9.4
   */
  const deleteTask = useCallback(
    async (id: string) => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Optimistic update - remove task immediately
      setTasks((prev) => prev.filter((task) => task.id !== id));

      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete task');
        }
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setTasks((prev) => [...prev, originalTask]);
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [tasks]
  );

  /**
   * Toggle task completion status
   * Validates Requirements: 2.6
   */
  const toggleComplete = useCallback(
    async (id: string) => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Optimistic update - toggle status immediately
      const newStatus = originalTask.status === 'completed' ? 'pending' : 'completed';
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, status: newStatus, updatedAt: new Date() }
            : task
        )
      );

      try {
        const response = await fetch(`/api/tasks/${id}/complete`, {
          method: 'PATCH',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to toggle task completion');
        }

        const updatedTask = await response.json();

        // Replace optimistic update with server response
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? originalTask : task))
        );
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [tasks]
  );

  /**
   * Refresh tasks from server
   */
  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  /**
   * Search tasks
   * Validates Requirements: 2.7
   */
  const searchTasks = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Filter tasks
   * Validates Requirements: 2.8
   */
  const filterTasks = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    refreshTasks,
    searchTasks,
    filterTasks,
  };
}
