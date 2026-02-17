/**
 * Optimized Data Fetching Hook
 * Implements caching, deduplication, and request batching
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface FetchOptions {
  cacheTime?: number; // Cache duration in milliseconds
  dedupe?: boolean; // Deduplicate concurrent requests
  retry?: number; // Number of retries on failure
  retryDelay?: number; // Delay between retries
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global cache for deduplication
const cache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();

export function useOptimizedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    dedupe = true,
    retry = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      // Check cache first
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        if (mountedRef.current) {
          setData(cached.data);
          setLoading(false);
        }
        return cached.data;
      }

      // Check for pending request (deduplication)
      if (dedupe && pendingRequests.has(key)) {
        const result = await pendingRequests.get(key);
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
        return result;
      }

      // Create new request
      const request = executeWithRetry(fetcher, retry, retryDelay);
      if (dedupe) {
        pendingRequests.set(key, request);
      }

      const result = await request;

      // Update cache
      cache.set(key, {
        data: result,
        timestamp: Date.now(),
      });

      if (mountedRef.current) {
        setData(result);
        setError(null);
      }

      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
      }
      throw err;
    } finally {
      if (dedupe) {
        pendingRequests.delete(key);
      }
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [key, fetcher, cacheTime, dedupe, retry, retryDelay]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    cache.delete(key);
    setLoading(true);
    return fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Execute function with retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return executeWithRetry(fn, retries - 1, delay * 2); // Exponential backoff
  }
}

/**
 * Clear cache for specific key or all keys
 */
export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Batch multiple fetch requests
 */
export async function batchFetch<T>(
  requests: Array<{ key: string; fetcher: () => Promise<T> }>,
  options: FetchOptions = {}
): Promise<T[]> {
  return Promise.all(
    requests.map(({ key, fetcher }) => {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < (options.cacheTime || 5 * 60 * 1000)) {
        return Promise.resolve(cached.data);
      }
      return fetcher().then(data => {
        cache.set(key, { data, timestamp: Date.now() });
        return data;
      });
    })
  );
}
