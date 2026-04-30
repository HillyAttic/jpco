'use client';

import React from 'react';
import type { FormField, FieldOption } from '@/types/form.types';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FieldEditor({ field, onUpdate, onDelete, onClose }: FieldEditorProps) {
  const [localField, setLocalField] = React.useState<FormField>(field);

  const handleChange = (updates: Partial<FormField>) => {
    const updated = { ...localField, ...updates };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleAddOption = () => {
    const newOption: FieldOption = {
      id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: `Option ${(localField.options?.length || 0) + 1}`,
      value: `option_${Date.now()}`,
    };
    handleChange({
      options: [...(localField.options || []), newOption],
    });
  };

  const handleUpdateOption = (index: number, updates: Partial<FieldOption>) => {
    const options = [...(localField.options || [])];
    options[index] = { ...options[index], ...updates };
    handleChange({ options });
  };

  const handleDeleteOption = (index: number) => {
    const options = [...(localField.options || [])];
    options.splice(index, 1);
    handleChange({ options });
  };

  const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(field.type);
  const isFileField = field.type === 'file';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Edit Field</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Field Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Label *
        </label>
        <input
          type="text"
          value={localField.label}
          onChange={(e) => handleChange({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter field label"
        />
      </div>

      {/* Placeholder */}
      {!needsOptions && !isFileField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Placeholder
          </label>
          <input
            type="text"
            value={localField.placeholder || ''}
            onChange={(e) => handleChange({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter placeholder text"
          />
        </div>
      )}

      {/* Help Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Help Text
        </label>
        <input
          type="text"
          value={localField.helpText || ''}
          onChange={(e) => handleChange({ helpText: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional instructions for this field"
        />
      </div>

      {/* Required */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="required"
          checked={localField.required}
          onChange={(e) => handleChange({ required: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="required" className="ml-2 text-sm text-gray-700">
          Required field
        </label>
      </div>

      {/* Validation Rules */}
      {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Validation</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                {field.type === 'number' ? 'Min Value' : 'Min Length'}
              </label>
              <input
                type="number"
                value={localField.validation?.min || ''}
                onChange={(e) =>
                  handleChange({
                    validation: {
                      ...localField.validation,
                      min: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                {field.type === 'number' ? 'Max Value' : 'Max Length'}
              </label>
              <input
                type="number"
                value={localField.validation?.max || ''}
                onChange={(e) =>
                  handleChange({
                    validation: {
                      ...localField.validation,
                      max: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {field.type === 'text' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Pattern (Regex)
              </label>
              <input
                type="text"
                value={localField.validation?.pattern || ''}
                onChange={(e) =>
                  handleChange({
                    validation: {
                      ...localField.validation,
                      pattern: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ^[A-Z]{3}$"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Custom Error Message
            </label>
            <input
              type="text"
              value={localField.validation?.customMessage || ''}
              onChange={(e) =>
                handleChange({
                  validation: {
                    ...localField.validation,
                    customMessage: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Custom validation error message"
            />
          </div>
        </div>
      )}

      {/* Options for select/radio/checkbox */}
      {needsOptions && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Options</h4>
            <button
              onClick={handleAddOption}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add Option
            </button>
          </div>

          <div className="space-y-2">
            {localField.options?.map((option, index) => (
              <div key={option.id || option.value || index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) =>
                    handleUpdateOption(index, { label: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Option label"
                />
                <input
                  type="text"
                  value={option.value}
                  onChange={(e) =>
                    handleUpdateOption(index, { value: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Option value"
                />
                <button
                  onClick={() => handleDeleteOption(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Settings */}
      {isFileField && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">File Settings</h4>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Accepted File Types
            </label>
            <input
              type="text"
              value={localField.accept || ''}
              onChange={(e) => handleChange({ accept: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder=".pdf,.doc,.docx,.jpg,.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated file extensions or MIME types
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={localField.maxFileSize ? localField.maxFileSize / (1024 * 1024) : ''}
              onChange={(e) =>
                handleChange({
                  maxFileSize: e.target.value
                    ? parseFloat(e.target.value) * 1024 * 1024
                    : undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="multiple"
              checked={localField.multiple || false}
              onChange={(e) => handleChange({ multiple: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="multiple" className="ml-2 text-sm text-gray-700">
              Allow multiple files
            </label>
          </div>
        </div>
      )}

      {/* Delete Button */}
      <div className="pt-4 border-t">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Field
        </button>
      </div>
    </div>
  );
}
