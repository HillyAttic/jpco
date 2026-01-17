'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useCategories } from '@/hooks/use-categories';
import { Category, CreateCategoryInput } from '@/types/category.types';
import { CategoryList, CategoryModal, CategorySkeleton } from '@/components/categories';
import { toast } from 'react-toastify';

export default function CategoriesPage() {
  const {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
  } = useCategories();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && category.isActive) ||
        (filterStatus === 'inactive' && !category.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [categories, searchQuery, filterStatus]);

  const handleOpenModal = (category?: Category) => {
    setSelectedCategory(category || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSubmit = async (data: CreateCategoryInput) => {
    try {
      setIsSubmitting(true);
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, data);
        toast.success('Category updated successfully!');
      } else {
        await createCategory(data);
        toast.success('Category created successfully!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCategory(id);
      toast.success('Category deleted successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleCategoryStatus(id, isActive);
      toast.success(`Category ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category status');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Show seed button if no categories exist and not loading
  const showSeedButton = !loading && categories.length === 0;

  const handleSeedCategories = async () => {
    try {
      const response = await fetch('/api/categories/seed', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`${result.message}`);
        // Refresh the page to show the new categories
        window.location.reload();
      } else {
        toast.error('Failed to seed categories');
      }
    } catch (error) {
      toast.error('Failed to seed categories');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-2">Organize and manage your task categories</p>
          <p className="text-sm text-blue-600 mt-1">✅ Connected to Firestore Database</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto text-white">
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Categories</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{categories.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Active</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {categories.filter((c) => c.isActive).length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Total Tasks</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">
            {categories.reduce((sum, c) => sum + c.taskCount, 0)}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('active')}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'inactive' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('inactive')}
            size="sm"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Categories List */}
      {loading ? (
        <CategorySkeleton />
      ) : (
        <>
          <CategoryList
            categories={filteredCategories}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
          
          {filteredCategories.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? 'No categories match your search criteria.'
                  : 'No categories found.'}
              </p>
              {showSeedButton && (
                <Button onClick={handleSeedCategories} variant="outline">
                  🌱 Seed Sample Categories
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        category={selectedCategory}
        isLoading={isSubmitting}
      />
    </div>
  );
}