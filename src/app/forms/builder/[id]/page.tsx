'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authenticatedFetch } from '@/lib/api-client';
import type { FormTemplate, FormField } from '@/types/form.types';
import { FormPreview } from '@/components/forms/builder/FormPreview';
import { GoogleFormsBuilder } from '@/components/forms/builder/google-style/GoogleFormsBuilder';
import { toast } from 'react-toastify';

export default function FormBuilderEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [formId, setFormId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-20 h-20 mx-auto mb-4 bg-indigo-500 rounded-xl flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Loading form...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!template) return null;

  const handlePublish = async (updatedForm: FormTemplate) => {
    if (!formId) return;

    try {
      const url = `/api/forms/templates/${formId}`;
      const response = await authenticatedFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedForm.title,
          description: updatedForm.description,
          status: updatedForm.status,
          fields: updatedForm.fields,
          settings: updatedForm.settings,
          accessControl: updatedForm.accessControl,
          category: updatedForm.category,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTemplate(result.template);
      } else {
        throw new Error(result.error || 'Failed to publish form');
      }
    } catch (error) {
      console.error('Failed to publish form:', error);
      throw error;
    }
  };

  return (
    <>
      <GoogleFormsBuilder
        form={template}
        onSave={async (updatedForm) => {
          if (!updatedForm.title.trim()) {
            return;
          }
          if (updatedForm.fields.length === 0) {
            return;
          }

          try {
            const url = isNew ? '/api/forms/templates' : `/api/forms/templates/${formId}`;
            const method = isNew ? 'POST' : 'PUT';

            const response = await authenticatedFetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: updatedForm.title,
                description: updatedForm.description,
                status: updatedForm.status,
                fields: updatedForm.fields,
                settings: updatedForm.settings,
                accessControl: updatedForm.accessControl,
                category: updatedForm.category,
              }),
            });

            const result = await response.json();

            if (response.ok) {
              if (isNew && result.template?.id) {
                setFormId(result.template.id);
                setIsNew(false);
                router.replace(`/forms/builder/${result.template.id}`);
              }
              setTemplate(result.template);
            }
          } catch (error) {
            console.error('Failed to save form:', error);
          }
        }}
        onPublish={handlePublish}
        onClose={() => router.push('/forms/builder')}
        onPreview={() => setShowPreview(true)}
      />
      {/* Preview Modal */}
      {showPreview && (
        <FormPreview template={template} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}
