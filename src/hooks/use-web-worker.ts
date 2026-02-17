/**
 * Web Worker Hook
 * Offloads heavy computations to background thread
 * Prevents main thread blocking
 */

import { useEffect, useRef, useState } from 'react';

export function useWebWorker<T, R>(
  workerFunction: (data: T) => R
): [(data: T) => Promise<R>, boolean, Error | null] {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create worker from function
    const workerCode = `
      self.onmessage = function(e) {
        try {
          const result = (${workerFunction.toString()})(e.data);
          self.postMessage({ result });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        URL.revokeObjectURL(workerUrl);
      }
    };
  }, [workerFunction]);

  const execute = (data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      setLoading(true);
      setError(null);

      workerRef.current.onmessage = (e) => {
        setLoading(false);
        if (e.data.error) {
          const err = new Error(e.data.error);
          setError(err);
          reject(err);
        } else {
          resolve(e.data.result);
        }
      };

      workerRef.current.onerror = (e) => {
        setLoading(false);
        const err = new Error(e.message);
        setError(err);
        reject(err);
      };

      workerRef.current.postMessage(data);
    });
  };

  return [execute, loading, error];
}

/**
 * Example usage:
 * 
 * const [processData, loading, error] = useWebWorker((data: number[]) => {
 *   // Heavy computation
 *   return data.map(n => n * 2).reduce((a, b) => a + b, 0);
 * });
 * 
 * const result = await processData([1, 2, 3, 4, 5]);
 */
