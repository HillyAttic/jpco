import { useEffect, useRef, useCallback } from 'react';

interface WorkerMessage {
  type: string;
  data?: any;
}

interface WorkerResponse {
  type: string;
  result?: any;
  error?: string;
}

/**
 * Hook to use Web Workers for heavy computations
 */
export function useWebWorker(workerPath: string) {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, (response: WorkerResponse) => void>>(new Map());

  useEffect(() => {
    // Only create worker in browser
    if (typeof window === 'undefined') return;

    // Create worker
    try {
      workerRef.current = new Worker(workerPath);

      // Handle messages from worker
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, result, error } = event.data;

        // Find and call the appropriate callback
        const callback = callbacksRef.current.get(type);
        if (callback) {
          callback(event.data);
          callbacksRef.current.delete(type);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[WebWorker] Error:', error);
      };
    } catch (error) {
      console.error('[WebWorker] Failed to create worker:', error);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [workerPath]);

  /**
   * Post message to worker
   */
  const postMessage = useCallback((message: WorkerMessage, callback?: (response: WorkerResponse) => void) => {
    if (!workerRef.current) {
      console.warn('[WebWorker] Worker not initialized');
      return;
    }

    // Register callback if provided
    if (callback) {
      const responseType = `${message.type}_COMPLETE`;
      callbacksRef.current.set(responseType, callback);
      callbacksRef.current.set('ERROR', callback);
    }

    // Post message to worker
    workerRef.current.postMessage(message);
  }, []);

  /**
   * Process data with promise-based API
   */
  const processData = useCallback(<T = any>(type: string, data: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      postMessage({ type, data }, (response) => {
        if (response.type === 'ERROR') {
          reject(new Error(response.error));
        } else {
          resolve(response.result as T);
        }
      });
    });
  }, [postMessage]);

  return {
    postMessage,
    processData,
    isSupported: typeof Worker !== 'undefined',
  };
}

/**
 * Hook specifically for data processing worker
 */
export function useDataProcessorWorker() {
  const { processData, isSupported } = useWebWorker('/workers/data-processor.worker.js');

  const processAttendanceData = useCallback((records: any[]) => {
    return processData('PROCESS_ATTENDANCE_DATA', { records });
  }, [processData]);

  const calculateStatistics = useCallback((records: any[], groupBy: string) => {
    return processData('CALCULATE_STATISTICS', { records, groupBy });
  }, [processData]);

  const filterLargeDataset = useCallback((records: any[], filters: any) => {
    return processData('FILTER_LARGE_DATASET', { records, filters });
  }, [processData]);

  const sortData = useCallback((records: any[], sortBy: string, sortOrder: 'asc' | 'desc') => {
    return processData('SORT_DATA', { records, sortBy, sortOrder });
  }, [processData]);

  return {
    processAttendanceData,
    calculateStatistics,
    filterLargeDataset,
    sortData,
    isSupported,
  };
}
