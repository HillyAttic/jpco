/**
 * Optimized Firebase Service Layer
 * Extends base Firebase service with caching and query optimization
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  WhereFilterOp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cacheService } from '@/lib/cache.service';

export interface FilterParams {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

export interface PaginationParams {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

export interface QueryOptions {
  filters?: FilterParams[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  pagination?: PaginationParams;
  useCache?: boolean; // Enable caching
  cacheTTL?: number; // Cache time-to-live
}

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Optimized Firebase Service Class with Caching
 */
export class OptimizedFirebaseService<T extends { id?: string }> {
  private collectionName: string;
  private defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Convert Firestore timestamp to Date
   */
  private convertTimestamps(data: any): any {
    const converted = { ...data };
    Object.keys(converted).forEach((key) => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });
    return converted;
  }

  /**
   * Convert Date objects to Firestore timestamps
   */
  private prepareForStorage(data: any): any {
    if (data === null || data === undefined) return data;
    if (data instanceof Date) return Timestamp.fromDate(data);
    if (Array.isArray(data)) return data.map(item => this.prepareForStorage(item));
    
    if (typeof data === 'object') {
      const prepared: any = {};
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== undefined) {
          prepared[key] = this.prepareForStorage(value);
        }
      });
      return prepared;
    }
    
    return data;
  }

  /**
   * Build query constraints
   */
  private buildQueryConstraints(options?: QueryOptions): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    if (options?.filters && options.filters.length > 0) {
      options.filters.forEach((filter) => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
    }

    if (options?.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
    }

    if (options?.pagination?.lastDoc) {
      constraints.push(startAfter(options.pagination.lastDoc));
    }

    if (options?.pagination?.pageSize) {
      constraints.push(limit(options.pagination.pageSize));
    }

    return constraints;
  }

  /**
   * Generate cache key for query
   */
  private getCacheKey(method: string, options?: any): string {
    return `${this.collectionName}:${method}`;
  }

  /**
   * Get a document by ID with caching
   */
  async getById(id: string, useCache = true): Promise<T | null> {
    const cacheKey = this.getCacheKey('getById');
    const cacheParams = { id };

    // Try cache first
    if (useCache) {
      const cached = await cacheService.get<T>(cacheKey, cacheParams, {
        storage: 'memory',
        ttl: this.defaultCacheTTL
      });
      if (cached) return cached;
    }

    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const result = {
        id: docSnap.id,
        ...this.convertTimestamps(docSnap.data()),
      } as T;

      // Cache the result
      if (useCache) {
        await cacheService.set(cacheKey, result, cacheParams, {
          storage: 'memory',
          ttl: this.defaultCacheTTL
        });
      }

      return result;
    } catch (error) {
      console.error(`Error in getById for ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents with caching
   */
  async getAll(options?: QueryOptions): Promise<T[]> {
    const useCache = options?.useCache !== false; // Default to true
    const cacheKey = this.getCacheKey('getAll');
    const cacheParams = options;

    // Try cache first
    if (useCache) {
      const cached = await cacheService.get<T[]>(cacheKey, cacheParams, {
        storage: 'indexeddb',
        ttl: options?.cacheTTL || this.defaultCacheTTL
      });
      if (cached) return cached;
    }

    try {
      const collectionRef = collection(db, this.collectionName);
      const constraints = this.buildQueryConstraints(options);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);

      const documents: T[] = [];
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...this.convertTimestamps(doc.data()),
        } as T);
      });

      // Cache the result
      if (useCache) {
        await cacheService.set(cacheKey, documents, cacheParams, {
          storage: 'indexeddb',
          ttl: options?.cacheTTL || this.defaultCacheTTL
        });
      }

      return documents;
    } catch (error) {
      console.error(`Error in getAll for ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new document and invalidate cache
   */
  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const preparedData = this.prepareForStorage(data);
      const docRef = await addDoc(collectionRef, {
        ...preparedData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const createdDoc = await getDoc(docRef);
      const result = {
        id: docRef.id,
        ...this.convertTimestamps(createdDoc.data()),
      } as T;

      // Invalidate cache
      await this.invalidateCache();

      return result;
    } catch (error) {
      console.error(`Error in create for ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update a document and invalidate cache
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const preparedData = this.prepareForStorage(data);
      
      await updateDoc(docRef, {
        ...preparedData,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(docRef);
      
      if (!updatedDoc.exists()) {
        throw new Error('Document not found after update');
      }

      const result = {
        id: updatedDoc.id,
        ...this.convertTimestamps(updatedDoc.data()),
      } as T;

      // Invalidate cache
      await this.invalidateCache();
      await cacheService.invalidate(this.getCacheKey('getById'), { id });

      return result;
    } catch (error) {
      console.error(`Error in update for ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document and invalidate cache
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);

      // Invalidate cache
      await this.invalidateCache();
      await cacheService.invalidate(this.getCacheKey('getById'), { id });
    } catch (error) {
      console.error(`Error in delete for ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate all cache for this collection
   */
  async invalidateCache(): Promise<void> {
    await cacheService.invalidatePattern(`${this.collectionName}:`);
  }

  /**
   * Search with optimized caching
   */
  async search(searchField: string, searchTerm: string, options?: QueryOptions): Promise<T[]> {
    const cacheKey = this.getCacheKey('search');
    const cacheParams = { searchField, searchTerm, ...options };

    // Try cache first
    const cached = await cacheService.get<T[]>(cacheKey, cacheParams, {
      storage: 'memory',
      ttl: this.defaultCacheTTL
    });
    if (cached) return cached;

    // Fetch and filter
    const documents = await this.getAll(options);
    const searchLower = searchTerm.toLowerCase();
    const results = documents.filter((doc: any) => {
      const fieldValue = doc[searchField];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchLower);
      }
      return false;
    });

    // Cache results
    await cacheService.set(cacheKey, results, cacheParams, {
      storage: 'memory',
      ttl: this.defaultCacheTTL
    });

    return results;
  }
}

/**
 * Create an optimized service instance
 */
export function createOptimizedFirebaseService<T extends { id?: string }>(
  collectionName: string
): OptimizedFirebaseService<T> {
  return new OptimizedFirebaseService<T>(collectionName);
}
