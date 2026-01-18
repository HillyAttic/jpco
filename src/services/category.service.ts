/**
 * Category Firestore Service
 * Handles all category-related database operations using Firestore
 */

import { Category, CreateCategoryInput } from '@/types/category.types';
import { createFirebaseService, QueryOptions } from './firebase.service';

// Create a Firebase service instance for categories
const categoryFirebaseService = createFirebaseService<Category>('categories');

export const categoryService = {
  /**
   * Get all categories
   */
  async getAll(options?: QueryOptions): Promise<Category[]> {
    return categoryFirebaseService.getAll(options);
  },

  /**
   * Get category by ID
   */
  async getById(id: string): Promise<Category | null> {
    return categoryFirebaseService.getById(id);
  },

  /**
   * Create a new category
   */
  async create(categoryData: CreateCategoryInput): Promise<Category> {
    const newCategory = {
      ...categoryData,
      taskCount: 0, // Initialize task count to 0
      isActive: categoryData.isActive ?? true, // Default to active if not specified
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return categoryFirebaseService.create(newCategory);
  },

  /**
   * Update an existing category
   */
  async update(id: string, categoryData: Partial<CreateCategoryInput>): Promise<Category> {
    return categoryFirebaseService.update(id, categoryData);
  },

  /**
   * Delete a category
   */
  async delete(id: string): Promise<void> {
    return categoryFirebaseService.delete(id);
  },

  /**
   * Toggle category active status
   */
  async toggleStatus(id: string, isActive: boolean): Promise<Category> {
    return categoryFirebaseService.update(id, { isActive });
  },

  /**
   * Search categories by name or description
   */
  async search(searchTerm: string, options?: QueryOptions): Promise<Category[]> {
    return categoryFirebaseService.searchMultipleFields(
      ['name', 'description'],
      searchTerm,
      options
    );
  },

  /**
   * Get categories with filters
   */
  async getFiltered(filters: {
    isActive?: boolean;
    searchTerm?: string;
  }): Promise<Category[]> {
    const queryOptions: QueryOptions = {
      filters: [],
      orderByField: 'name',
      orderDirection: 'asc',
    };

    // Add active status filter if specified
    if (filters.isActive !== undefined) {
      queryOptions.filters!.push({
        field: 'isActive',
        operator: '==',
        value: filters.isActive,
      });
    }

    // If search term is provided, use search method
    if (filters.searchTerm) {
      return this.search(filters.searchTerm, queryOptions);
    }

    return this.getAll(queryOptions);
  },

  /**
   * Update task count for a category
   */
  async updateTaskCount(id: string, taskCount: number): Promise<Category> {
    return categoryFirebaseService.update(id, { taskCount });
  },

  /**
   * Increment task count for a category
   */
  async incrementTaskCount(id: string): Promise<Category> {
    const category = await this.getById(id);
    if (!category) {
      throw new Error('Category not found');
    }
    return this.updateTaskCount(id, category.taskCount + 1);
  },

  /**
   * Decrement task count for a category
   */
  async decrementTaskCount(id: string): Promise<Category> {
    const category = await this.getById(id);
    if (!category) {
      throw new Error('Category not found');
    }
    return this.updateTaskCount(id, Math.max(0, category.taskCount - 1));
  },

  /**
   * Get categories with task counts
   */
  async getCategoriesWithTaskCounts(): Promise<Category[]> {
    return this.getAll({
      orderByField: 'name',
      orderDirection: 'asc',
    });
  },

  /**
   * Check if category exists
   */
  async exists(id: string): Promise<boolean> {
    return categoryFirebaseService.exists(id);
  },

  /**
   * Batch delete categories
   */
  async batchDelete(ids: string[]): Promise<void> {
    return categoryFirebaseService.batchDelete(ids);
  },
};