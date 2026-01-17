import React from 'react';
import { Category } from '@/types/category.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PencilSquareIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export function CategoryCard({ category, onEdit, onDelete, onToggleStatus }: CategoryCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-l-4" style={{ borderLeftColor: category.color }}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* Category Icon/Color */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon ? (
                <span className="text-2xl">{category.icon}</span>
              ) : (
                <TagIcon className="w-6 h-6" style={{ color: category.color }} />
              )}
            </div>

            {/* Category Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {category.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    category.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {category.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <TagIcon className="w-4 h-4" />
                  {category.taskCount} {category.taskCount === 1 ? 'task' : 'tasks'}
                </span>
                <span>
                  Created {new Date(category.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(category)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(category.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Toggle Status */}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => onToggleStatus(category.id, !category.isActive)}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {category.isActive ? 'Deactivate' : 'Activate'} category
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
