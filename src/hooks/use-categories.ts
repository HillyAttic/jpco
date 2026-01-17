import { useState, useEffect, useCallback } from 'react';
import { Category, CreateCategoryInput } from '@/types/category.types';
import { categoryApi } from '@/services/category.api';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryApi.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (categoryData: CreateCategoryInput) => {
    try {
      const newCategory = await categoryApi.createCategory(categoryData);
      setCategories((prev) => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const updateCategory = async (id: string, categoryData: Partial<CreateCategoryInput>) => {
    try {
      const updatedCategory = await categoryApi.updateCategory(id, categoryData);
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? updatedCategory : cat))
      );
      return updatedCategory;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await categoryApi.deleteCategory(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const toggleCategoryStatus = async (id: string, isActive: boolean) => {
    try {
      const updatedCategory = await categoryApi.toggleCategoryStatus(id, isActive);
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? updatedCategory : cat))
      );
      return updatedCategory;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to toggle category status');
    }
  };

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
  };
}
