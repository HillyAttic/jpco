import { useState, useEffect, useCallback } from 'react';
import { RecurringTask } from '@/services/recurring-task.service';
import { auth } from '@/lib/firebase';

interface UseRecurringTasksOptions {
  initialFetch?: boolean;
}

interface RecurringTaskFilters {
  status?: string;
  priority?: string;
  category?: string;
  isPaused?: boolean;
}

interface UseRecurringTasksReturn {
  tasks: RecurringTask[];
  loading: boolean;
  error: Error | null;
  createTask: (data: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'completionHistory' | 'isPaused'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Omit<RecurringTask, 'id'>>) => Promise<void>;
  deleteTask: (id: string, option?: 'all' | 'stop') => Promise<void>;
  pauseTask: (id: string) => Promise<void>;
  resumeTask: (id: string) => Promise<void>;
  completeCycle: (id: string, completedBy: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  searchTasks: (query: string) => void;
  filterTasks: (filters: RecurringTaskFilters) => void;
}

/**
 * Get authentication headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Custom hook for managing recurring tasks with CRUD operations and optimistic updates
 * Validates Requirements: 3.5, 3.6
 */
export function useRecurringTasks(options: UseRecurringTasksOptions = {}): UseRecurringTasksReturn {
  const { initialFetch = true } = options;

  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<RecurringTaskFilters>({});

  /**
   * Fetch recurring tasks from API
   */
  const fetchTasks = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!auth.currentUser) {
      console.log('[useRecurringTasks] User not authenticated, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.isPaused !== undefined) params.append('isPaused', String(filters.isPaused));

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recurring-tasks?${params.toString()}`, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch recurring tasks');
      }

      const result = await response.json();
      setTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[useRecurringTasks] Error fetching recurring tasks:', error);
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
   * Create a new recurring task with optimistic update
   * Validates Requirements: 9.3
   */
  const createTask = useCallback(
    async (data: Omit<RecurringTask, 'id' | 'createdAt' | 'updatedAt' | 'completionHistory' | 'isPaused'>) => {
      // Check authentication
      if (!auth.currentUser) {
        const error = new Error('User not authenticated');
        setError(error);
        throw error;
      }

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticTask: RecurringTask = {
        ...data,
        id: tempId,
        completionHistory: [],
        isPaused: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistic update - add task immediately
      setTasks((prev) => [optimisticTask, ...prev]);

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/recurring-tasks', {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create recurring task');
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
        console.error('[useRecurringTasks] Error creating task:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Update an existing recurring task with optimistic update
   */
  const updateTask = useCallback(
    async (id: string, data: Partial<Omit<RecurringTask, 'id'>>) => {
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
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/recurring-tasks/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update recurring task');
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
   * Delete a recurring task with optimistic update
   * Validates Requirements: 3.10, 9.4
   */
  const deleteTask = useCallback(
    async (id: string, option: 'all' | 'stop' = 'all') => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      if (option === 'stop') {
        // Optimistic update - mark as paused with end date
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? { ...task, isPaused: true, endDate: new Date(), updatedAt: new Date() }
              : task
          )
        );
      } else {
        // Optimistic update - remove task immediately
        setTasks((prev) => prev.filter((task) => task.id !== id));
      }

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/recurring-tasks/${id}?option=${option}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete recurring task');
        }

        // If stopped, refresh to get updated task from server
        if (option === 'stop') {
          await fetchTasks();
        }
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        if (option === 'stop') {
          setTasks((prev) =>
            prev.map((task) => (task.id === id ? originalTask : task))
          );
        } else {
          setTasks((prev) => [...prev, originalTask]);
        }
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [tasks, fetchTasks]
  );

  /**
   * Pause a recurring task
   * Validates Requirements: 3.5
   */
  const pauseTask = useCallback(
    async (id: string) => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Optimistic update - mark as paused immediately
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, isPaused: true, updatedAt: new Date() }
            : task
        )
      );

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/recurring-tasks/${id}/pause`, {
          method: 'PATCH',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to pause recurring task');
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
   * Resume a paused recurring task
   * Validates Requirements: 3.5
   */
  const resumeTask = useCallback(
    async (id: string) => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Optimistic update - mark as active immediately
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, isPaused: false, updatedAt: new Date() }
            : task
        )
      );

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/recurring-tasks/${id}/resume`, {
          method: 'PATCH',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to resume recurring task');
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
   * Complete a cycle and schedule next occurrence
   * Validates Requirements: 3.4, 3.6
   */
  const completeCycle = useCallback(
    async (id: string, completedBy: string) => {
      // Store original task for rollback
      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Optimistic update - add to completion history
      const newCompletionRecord = {
        date: new Date(),
        completedBy,
      };

      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                completionHistory: [...task.completionHistory, newCompletionRecord],
                updatedAt: new Date(),
              }
            : task
        )
      );

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/recurring-tasks/${id}/complete`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ completedBy }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to complete recurring task cycle');
        }

        const updatedTask = await response.json();

        // Replace optimistic update with server response (includes next occurrence)
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
   * Search recurring tasks
   */
  const searchTasks = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Filter recurring tasks
   */
  const filterTasks = useCallback((newFilters: RecurringTaskFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    pauseTask,
    resumeTask,
    completeCycle,
    refreshTasks,
    searchTasks,
    filterTasks,
  };
}
