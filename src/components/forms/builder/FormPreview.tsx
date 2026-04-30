'use client';

import React from 'react';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import type { FormTemplate } from '@/types/form.types';

interface FormPreviewProps {
  template: FormTemplate;
  onClose: () => void;
}

export function FormPreview({ template, onClose }: FormPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Form Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-8">
            <FormRenderer
              template={template}
              onSuccess={() => {
                alert('This is a preview. Form submission is disabled.');
              }}
              onError={() => {
                alert('This is a preview. Form submission is disabled.');
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
          <p className="text-sm text-gray-600 text-center">
            This is a preview. Form submissions are disabled in preview mode.
          </p>
        </div>
      </div>
    </div>
  );
}
