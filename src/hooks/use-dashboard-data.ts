import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api-client';

interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
}

interface DashboardTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  assignedTo: string[];
  assignedToNames: string[];
  isRecurring?: boolean;
}

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  tasks: DashboardTask[];
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  refresh: () => Promise<void>;
}

/**
 * Optimized dashboard data hook
 * - Fetches only stats initially (minimal Firestore reads)
 * - Loads tasks on-demand with pagination
 * - Caches data with 2-minute TTL
 */
export function useDashboardData(): UseDashboardDataReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  const fetchStats = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const fetchTasks = useCallback(async (reset = false) => {
    try {
      const params = new URLSearchParams({
        limit: '30',
        includeRecurring: 'true'
      });
      
      if (!reset && cursor) {
        params.append('cursor', cursor);
      }

      const response = await authenticatedFetch(`/api/dashboard/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      
      if (reset) {
        setTasks(data.tasks);
      } else {
        setTasks(prev => [...prev, ...data.tasks]);
      }
      
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err as Error);
    }
  }, [cursor]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    await fetchTasks(false);
    setLoading(false);
  }, [hasMore, loading, fetchTasks]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setCursor(null);
    setHasMore(true);
    await Promise.all([fetchStats(), fetchTasks(true)]);
    setLoading(false);
  }, [fetchStats, fetchTasks]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // Check cache
      const now = Date.now();
      if (now - lastFetch < CACHE_TTL && stats) {
        setLoading(false);
        return;
      }

      await Promise.all([fetchStats(), fetchTasks(true)]);
      setLoading(false);
    };

    init();
  }, []);

  return {
    stats,
    tasks,
    loading,
    error,
    loadMore,
    hasMore,
    refresh
  };
}
