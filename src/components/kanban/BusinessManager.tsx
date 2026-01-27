'use client';

import { useState } from 'react';
import { Business } from '@/types/kanban.types';
import { Button } from '@/components/ui/button';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface BusinessManagerProps {
  businesses: Business[];
  selectedBusinessId: string | null;
  onSelectBusiness: (businessId: string) => void;
  onAddBusiness: (business: Omit<Business, 'id' | 'createdAt'>) => void;
  onUpdateBusiness: (business: Business) => void;
  onDeleteBusiness: (businessId: string) => void;
}

const BUSINESS_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export function BusinessManager({
  businesses,
  selectedBusinessId,
  onSelectBusiness,
  onAddBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
}: BusinessManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: BUSINESS_COLORS[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    if (editingBusiness) {
      onUpdateBusiness({
        ...editingBusiness,
        ...formData,
      });
    } else {
      onAddBusiness(formData);
    }

    setFormData({ name: '', description: '', color: BUSINESS_COLORS[0] });
    setShowAddModal(false);
    setEditingBusiness(null);
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      description: business.description || '',
      color: business.color,
    });
    setShowAddModal(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', color: BUSINESS_COLORS[0] });
    setShowAddModal(false);
    setEditingBusiness(null);
  };

  return (
    <div className="space-y-4">
      {/* Business Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {businesses.map((business) => (
          <div key={business.id} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onSelectBusiness(business.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                selectedBusinessId === business.id
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: selectedBusinessId === business.id ? business.color : undefined,
              }}
            >
              {business.name}
            </button>
            
            {selectedBusinessId === business.id && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(business)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Edit business"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                
                {businesses.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${business.name}"? All tasks will be removed.`)) {
                        onDeleteBusiness(business.id);
                      }
                    }}
                    className="p-1.5 rounded hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                    title="Delete business"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        
        <Button
          onClick={() => setShowAddModal(true)}
          variant="outline"
          className="flex items-center gap-2 flex-shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Add Business
        </Button>
      </div>

      {/* Add/Edit Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingBusiness ? 'Edit Business' : 'Add New Business'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Tech Startup, Consulting Firm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this business"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingBusiness ? 'Update' : 'Add'} Business
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
