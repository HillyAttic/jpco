'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

export default function FormBuilderListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await authenticatedFetch(`/api/forms/templates?${params}`);
      const result = await response.json();

      if (response.ok) {
        setTemplates(result.templates);
      } else {
        toast.error(result.error || 'Failed to load forms');
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/forms/builder/new');
  };

  const handleEdit = (id: string) => {
    router.push(`/forms/builder/${id}`);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/forms/templates/${id}/duplicate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Form duplicated successfully');
        fetchTemplates();
      } else {
        toast.error(result.error || 'Failed to duplicate form');
      }
    } catch (error) {
      toast.error('Failed to duplicate form');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await authenticatedFetch(`/api/forms/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Form deleted successfully');
        fetchTemplates();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to delete form');
      }
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const response = await authenticatedFetch(`/api/forms/templates/${id}/publish`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Form published successfully');
        fetchTemplates();
      } else {
        toast.error(result.error || 'Failed to publish form');
      }
    } catch (error) {
      toast.error('Failed to publish form');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create New Form
          </button>
        </div>

        {/* Filters */}
        <div className="flex space-x-2">
          {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No forms found</p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {template.title}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
                {getStatusBadge(template.status)}
              </div>

              <div className="text-sm text-gray-500 mb-4">
                <p>{template.fields.length} fields</p>
                <p>{template.submissionCount} submissions</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleEdit(template.id)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                {template.status === 'draft' && (
                  <button
                    onClick={() => handlePublish(template.id)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Publish
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(template.id)}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(template.id, template.title)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
