/**
 * Task Chunking Utilities
 * Breaks up long-running tasks into smaller chunks to prevent main thread blocking
 */

/**
 * Process array items in chunks using requestIdleCallback
 * Prevents blocking the main thread for large datasets
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 50
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    // Process chunk
    const chunkResults = chunk.map(processor);
    results.push(...chunkResults);
    
    // Yield to browser between chunks
    if (i + chunkSize < items.length) {
      await yieldToMain();
    }
  }
  
  return results;
}

/**
 * Yield control back to the main thread
 * Allows browser to process user interactions and rendering
 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      (window as any).scheduler.yield().then(resolve);
    } else if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Debounce function to limit execution frequency
 * Useful for expensive operations triggered by user input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution rate
 * Ensures function runs at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Batch multiple state updates into a single render
 * Reduces unnecessary re-renders
 */
export function batchUpdates(callback: () => void) {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    requestAnimationFrame(callback);
  } else {
    callback();
  }
}
