'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
        const template = result.template;
        const seenIds = new Set<string>();
        const fixedFields = template.fields.map((field: FormField) => {
          if (seenIds.has(field.id)) {
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

    toast.success(`${type} field added`);
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

    fields.forEach((field, i) => {
      field.order = i;
    });

    setTemplate({
      ...template,
      fields,
    });

    toast.success('Field deleted');
  };

  const handleReorderFields = (reorderedFields: FormField[]) => {
    if (!template) return;

    setTemplate({
      ...template,
      fields: reorderedFields,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-200"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-4 border-purple-500 border-t-transparent"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading form builder...</p>
        </motion.div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-20 shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-2xl">
                <input
                  type="text"
                  value={template.title}
                  onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                  className="text-2xl font-bold text-gray-900 border-none focus:outline-none focus:ring-0 w-full bg-transparent placeholder-gray-400"
                  placeholder="Form Title"
                />
                <input
                  type="text"
                  value={template.description || ''}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  className="text-sm text-gray-600 border-none focus:outline-none focus:ring-0 w-full mt-1 bg-transparent placeholder-gray-400"
                  placeholder="Add a description to help users understand this form"
                />
              </div>

              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(true)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center shadow-md"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Form
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/forms/builder')}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Close
                </motion.button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-all ${
                  activeTab === 'fields'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Form Fields
                </span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'fields' ? (
              <motion.div
                key="fields"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-6"
              >
                <div className="lg:col-span-3">
                  <FormBuilderCanvas
                    fields={template.fields}
                    onUpdateField={handleUpdateField}
                    onDeleteField={handleDeleteField}
                    onReorderFields={handleReorderFields}
                    onAddField={handleAddField}
                  />
                </div>
                <div className="lg:col-span-1">
                  <FieldPalette onAddField={handleAddField} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto"
              >
                <FormSettingsPanel
                  settings={template.settings}
                  accessControl={template.accessControl}
                  onUpdateSettings={(settings) => setTemplate({ ...template, settings })}
                  onUpdateAccessControl={(accessControl) =>
                    setTemplate({ ...template, accessControl })
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <FormPreview template={template} onClose={() => setShowPreview(false)} />
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  );
}
