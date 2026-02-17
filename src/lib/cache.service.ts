/**
 * Client-Side Caching Service
 * Implements multi-layer caching strategy to minimize Firebase reads
 * 
 * Cache Layers:
 * 1. Memory Cache (fastest, session-only)
 * 2. IndexedDB (persistent, large datasets)
 * 3. localStorage (persistent, small data)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default: 5 minutes
  storage?: 'memory' | 'indexeddb' | 'localstorage';
  forceRefresh?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MEMORY_CACHE = new Map<string, CacheEntry<any>>();

/**
 * Cache Service for optimizing Firebase reads
 */
export class CacheService {
  private dbName = 'firebase-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(namespace: string, params?: any): string {
    if (!params) return namespace;
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `${namespace}:${paramStr}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValid<T>(entry: CacheEntry<T> | null): boolean {
    if (!entry) return false;
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Get from memory cache
   */
  private getFromMemory<T>(key: string): T | null {
    const entry = MEMORY_CACHE.get(key);
    if (this.isValid(entry)) {
      console.log(`[Cache] Memory HIT: ${key}`);
      return entry.data;
    }
    if (entry) {
      MEMORY_CACHE.delete(key);
    }
    return null;
  }

  /**
   * Set to memory cache
   */
  private setToMemory<T>(key: string, data: T, ttl: number): void {
    MEMORY_CACHE.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get from IndexedDB
   */
  private async getFromIndexedDB<T>(key: string): Promise<T | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result && this.isValid(result)) {
            console.log(`[Cache] IndexedDB HIT: ${key}`);
            // Also cache in memory for faster subsequent access
            this.setToMemory(key, result.data, result.ttl);
            resolve(result.data);
          } else {
            if (result) {
              // Clean up expired entry
              this.deleteFromIndexedDB(key);
            }
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] IndexedDB get error:', error);
      return null;
    }
  }

  /**
   * Set to IndexedDB
   */
  private async setToIndexedDB<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const request = store.put({
          key,
          data,
          timestamp: Date.now(),
          ttl,
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] IndexedDB set error:', error);
    }
  }

  /**
   * Delete from IndexedDB
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] IndexedDB delete error:', error);
    }
  }

  /**
   * Get from localStorage
   */
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      if (this.isValid(entry)) {
        console.log(`[Cache] localStorage HIT: ${key}`);
        return entry.data;
      }

      localStorage.removeItem(key);
      return null;
    } catch (error) {
      console.error('[Cache] localStorage get error:', error);
      return null;
    }
  }

  /**
   * Set to localStorage
   */
  private setToLocalStorage<T>(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('[Cache] localStorage set error:', error);
    }
  }

  /**
   * Get cached data
   */
  async get<T>(
    namespace: string,
    params?: any,
    options: CacheOptions = {}
  ): Promise<T | null> {
    if (options.forceRefresh) {
      console.log(`[Cache] Force refresh: ${namespace}`);
      return null;
    }

    const key = this.generateKey(namespace, params);
    const storage = options.storage || 'memory';

    // Try memory first (fastest)
    const memoryData = this.getFromMemory<T>(key);
    if (memoryData !== null) return memoryData;

    // Try IndexedDB for large datasets
    if (storage === 'indexeddb') {
      const idbData = await this.getFromIndexedDB<T>(key);
      if (idbData !== null) return idbData;
    }

    // Try localStorage for small data
    if (storage === 'localstorage') {
      const lsData = this.getFromLocalStorage<T>(key);
      if (lsData !== null) return lsData;
    }

    console.log(`[Cache] MISS: ${key}`);
    return null;
  }

  /**
   * Set cached data
   */
  async set<T>(
    namespace: string,
    data: T,
    params?: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateKey(namespace, params);
    const ttl = options.ttl || DEFAULT_TTL;
    const storage = options.storage || 'memory';

    // Always cache in memory for fast access
    this.setToMemory(key, data, ttl);

    // Also persist based on storage option
    if (storage === 'indexeddb') {
      await this.setToIndexedDB(key, data, ttl);
    } else if (storage === 'localstorage') {
      this.setToLocalStorage(key, data, ttl);
    }

    console.log(`[Cache] SET: ${key} (${storage})`);
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(namespace: string, params?: any): Promise<void> {
    const key = this.generateKey(namespace, params);

    // Remove from memory
    MEMORY_CACHE.delete(key);

    // Remove from IndexedDB
    await this.deleteFromIndexedDB(key);

    // Remove from localStorage
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[Cache] localStorage remove error:', error);
    }

    console.log(`[Cache] INVALIDATED: ${key}`);
  }

  /**
   * Invalidate all cache entries matching namespace pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of MEMORY_CACHE.keys()) {
      if (key.startsWith(pattern)) {
        MEMORY_CACHE.delete(key);
      }
    }

    // Clear IndexedDB
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.key.toString().startsWith(pattern)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('[Cache] IndexedDB pattern invalidation error:', error);
    }

    // Clear localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(pattern)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[Cache] localStorage pattern invalidation error:', error);
    }

    console.log(`[Cache] INVALIDATED PATTERN: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    // Clear memory
    MEMORY_CACHE.clear();

    // Clear IndexedDB
    try {
      const db = await this.initDB();
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
    } catch (error) {
      console.error('[Cache] IndexedDB clear error:', error);
    }

    // Clear localStorage (only cache entries)
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes(':') || key.startsWith('cache:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[Cache] localStorage clear error:', error);
    }

    console.log('[Cache] CLEARED ALL');
  }

  /**
   * Get cache statistics
   */
  getStats(): { memorySize: number; memoryKeys: string[] } {
    return {
      memorySize: MEMORY_CACHE.size,
      memoryKeys: Array.from(MEMORY_CACHE.keys()),
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

/**
 * Decorator for caching function results
 */
export function cached(namespace: string, options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const params = args.length > 0 ? args[0] : undefined;
      
      // Try to get from cache
      const cachedData = await cacheService.get(namespace, params, options);
      if (cachedData !== null) {
        return cachedData;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cacheService.set(namespace, result, params, options);

      return result;
    };

    return descriptor;
  };
}
