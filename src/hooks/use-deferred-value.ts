/**
 * Custom hook for deferring expensive computations
 * Breaks up long tasks into smaller chunks to prevent main thread blocking
 */

import { useEffect, useState, useRef } from 'react';

export function useDeferredValue<T>(value: T, delay: number = 0): T {
  const [deferredValue, setDeferredValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDeferredValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return deferredValue;
}

/**
 * Hook to defer rendering of non-critical components
 * Prevents blocking during initial page load
 */
export function useDeferredRender(delay: number = 100): boolean {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return shouldRender;
}

/**
 * Hook to schedule work during idle time
 * Uses requestIdleCallback to avoid blocking user interactions
 */
export function useIdleCallback(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(callback, { timeout: 2000 });
      return () => cancelIdleCallback(handle);
    } else {
      // Fallback for browsers without requestIdleCallback
      const timer = setTimeout(callback, 100);
      return () => clearTimeout(timer);
    }
  }, deps);
}
