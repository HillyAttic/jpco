'use client';

import React from 'react';
import type { FormFieldType } from '@/types/form.types';

interface FieldPaletteProps {
  onAddField: (type: FormFieldType) => void;
}

const fieldTypes: Array<{
  type: FormFieldType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: 'text', label: 'Text', icon: '📝', description: 'Single line text input' },
  { type: 'textarea', label: 'Textarea', icon: '📄', description: 'Multi-line text input' },
  { type: 'number', label: 'Number', icon: '🔢', description: 'Numeric input' },
  { type: 'email', label: 'Email', icon: '📧', description: 'Email address input' },
  { type: 'phone', label: 'Phone', icon: '📱', description: 'Phone number input' },
  { type: 'date', label: 'Date', icon: '📅', description: 'Date picker' },
  { type: 'time', label: 'Time', icon: '⏰', description: 'Time picker' },
  { type: 'select', label: 'Select', icon: '📋', description: 'Dropdown selection' },
  { type: 'multiselect', label: 'Multi-Select', icon: '☑️', description: 'Multiple selection dropdown' },
  { type: 'radio', label: 'Radio', icon: '🔘', description: 'Single choice from options' },
  { type: 'checkbox', label: 'Checkbox', icon: '✅', description: 'Multiple choice from options' },
  { type: 'file', label: 'File Upload', icon: '📎', description: 'File attachment' },
];

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Field</h3>
      <div className="space-y-2">
        {fieldTypes.map((field) => (
          <button
            key={field.type}
            onClick={() => onAddField(field.type)}
            className="w-full flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <span className="text-2xl">{field.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{field.label}</div>
              <div className="text-xs text-gray-500">{field.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
