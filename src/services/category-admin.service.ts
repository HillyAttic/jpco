/**
 * Category Admin Service
 * Server-side service using Firebase Admin SDK for category operations
 */

import { createAdminService } from './admin-base.service';

export interface Category {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Create base admin service
const baseService = createAdminService<Category>('categories');

/**
 * Category Admin Service - Server-side only
 */
export const categoryAdminService = {
  ...baseService,

  /**
   * Get all categories with filters
   */
  async getAll(filters?: {
    isActive?: boolean;
    search?: string;
  }): Promise<Category[]> {
    const options: any = {};

    // Add active filter
    if (filters?.isActive !== undefined) {
      options.filters = [
        {
          field: 'isActive',
          operator: '==',
          value: filters.isActive,
        },
      ];
    }

    // Add default ordering
    options.orderBy = {
      field: 'name',
      direction: 'asc' as const,
    };

    let categories = await baseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      categories = categories.filter(
        (category) =>
          category.name.toLowerCase().includes(searchLower) ||
          category.description?.toLowerCase().includes(searchLower)
      );
    }

    return categories;
  },

  /**
   * Toggle category active status
   */
  async toggle(id: string): Promise<Category> {
    const category = await baseService.getById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    return await baseService.update(id, {
      isActive: !category.isActive,
    });
  },
};
