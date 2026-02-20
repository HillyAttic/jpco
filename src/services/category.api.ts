import { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category.types';
import { authenticatedFetch } from '@/lib/api-client';

const API_BASE_URL = '/api/categories';

export const categoryApi = {
  // Fetch all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await authenticatedFetch(API_BASE_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  },

  // Fetch a single category by ID
  getCategoryById: async (id: string): Promise<Category> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.statusText}`);
    }

    return response.json();
  },

  // Create a new category
  createCategory: async (categoryData: CreateCategoryInput): Promise<Category> => {
    const response = await authenticatedFetch(API_BASE_URL, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create category: ${response.statusText}`);
    }

    return response.json();
  },

  // Update an existing category
  updateCategory: async (id: string, categoryData: Partial<CreateCategoryInput>): Promise<Category> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update category: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete a category
  deleteCategory: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete category: ${response.statusText}`);
    }
  },

  // Toggle category active status
  toggleCategoryStatus: async (id: string, isActive: boolean): Promise<Category> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle category status: ${response.statusText}`);
    }

    return response.json();
  },
};
