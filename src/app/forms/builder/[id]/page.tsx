'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate, FormField, FormFieldType } from '@/types/form.types';
import { FormBuilderCanvas } from '@/components/forms/builder/FormBuilderCanvas';
import { FieldPalette } from '@/components/forms/builder/FieldPalette';
import { FormSettingsPanel } from '@/components/forms/builder/FormSettingsPanel';
import { FormPreview } from '@/components/forms/builder/FormPreview';
import { toast } from 'react-toastify';

export default function FormBuilderEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [formId, setFormId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings'>('fields');
  const fieldIdCounter = React.useRef(0);

  useEffect(() => {
    const initializeParams = async () => {
      const { id } = await params;
      setFormId(id);
      setIsNew(id === 'new');
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (formId === null) return;

    if (isNew) {
      // Initialize new template
      setTemplate({
        id: 'new',
        title: 'Untitled Form',
        description: '',
        status: 'draft',
        fields: [],
        settings: {
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
          allowMultipleSubmissions: false,
        },
        accessControl: {
          type: 'authenticated',
        },
        submissionCount: 0,
        createdBy: '',
        createdAt: null as any,
        updatedAt: null as any,
      });
      setLoading(false);
    } else {
      fetchTemplate();
    }
  }, [formId, isNew]);

  const fetchTemplate = async () => {
    if (!formId) return;

    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/forms/templates/${formId}`);
      const result = await response.json();

      if (response.ok) {
        // Fix duplicate field IDs if they exist
        const template = result.template;
        const seenIds = new Set<string>();
        const fixedFields = template.fields.map((field: FormField) => {
          if (seenIds.has(field.id)) {
            // Generate new unique ID for duplicate
            return { ...field, id: `field_${Date.now()}_${fieldIdCounter.current++}` };
          }
          seenIds.add(field.id);
          return field;
        });

        setTemplate({ ...template, fields: fixedFields });
      } else {
        toast.error(result.error || 'Failed to load form');
        router.push('/forms/builder');
      }
    } catch (error) {
      toast.error('Failed to load form');
      router.push('/forms/builder');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template || !formId) return;

    if (!template.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    if (template.fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    try {
      setSaving(true);

      const url = isNew ? '/api/forms/templates' : `/api/forms/templates/${formId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          status: template.status,
          fields: template.fields,
          settings: template.settings,
          accessControl: template.accessControl,
          category: template.category,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Form saved successfully');
        if (isNew) {
          router.push(`/forms/builder/${result.template.id}`);
        } else {
          setTemplate(result.template);
        }
      } else {
        toast.error(result.error || 'Failed to save form');
      }
    } catch (error) {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = (type: FormFieldType) => {
    if (!template) return;

    const newField: FormField = {
      id: `field_${Date.now()}_${fieldIdCounter.current++}`,
      type,
      label: `New ${type} field`,
      required: false,
      order: template.fields.length,
    };

    setTemplate({
      ...template,
      fields: [...template.fields, newField],
    });
  };

  const handleUpdateField = (index: number, updatedField: FormField) => {
    if (!template) return;

    const fields = [...template.fields];
    fields[index] = updatedField;

    setTemplate({
      ...template,
      fields,
    });
  };

  const handleDeleteField = (index: number) => {
    if (!template) return;

    const fields = [...template.fields];
    fields.splice(index, 1);

    // Reorder remaining fields
    fields.forEach((field, i) => {
      field.order = i;
    });

    setTemplate({
      ...template,
      fields,
    });
  };

  const handleReorderField = (fromIndex: number, direction: 'up' | 'down') => {
    if (!template) return;

    const fields = [...template.fields];
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= fields.length) return;

    // Swap orders
    const temp = fields[fromIndex].order;
    fields[fromIndex].order = fields[toIndex].order;
    fields[toIndex].order = temp;

    setTemplate({
      ...template,
      fields,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={template.title}
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                className="text-2xl font-bold text-gray-900 border-none focus:outline-none focus:ring-0 w-full"
                placeholder="Form Title"
              />
              <input
                type="text"
                value={template.description || ''}
                onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                className="text-sm text-gray-600 border-none focus:outline-none focus:ring-0 w-full mt-1"
                placeholder="Form description (optional)"
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => router.push('/forms/builder')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fields'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Fields
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'fields' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <FormBuilderCanvas
                fields={template.fields}
                onUpdateField={handleUpdateField}
                onDeleteField={handleDeleteField}
                onReorderField={handleReorderField}
              />
            </div>
            <div className="lg:col-span-1">
              <FieldPalette onAddField={handleAddField} />
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <FormSettingsPanel
              settings={template.settings}
              accessControl={template.accessControl}
              onUpdateSettings={(settings) => setTemplate({ ...template, settings })}
              onUpdateAccessControl={(accessControl) =>
                setTemplate({ ...template, accessControl })
              }
            />
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <FormPreview template={template} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
