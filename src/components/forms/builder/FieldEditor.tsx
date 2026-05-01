'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { FormField } from '@/types/form.types';

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FieldEditor({ field, onUpdate, onDelete, onClose }: FieldEditorProps) {
  const [localField, setLocalField] = useState(field);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdate = (updates: Partial<FormField>) => {
    const updated = { ...localField, ...updates };
    setLocalField(updated);
    onUpdate(updated);
  };

  const handleAddOption = () => {
    const options = localField.options || [];
    handleUpdate({
      options: [...options, `Option ${options.length + 1}`],
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const options = [...(localField.options || [])];
    options[index] = value;
    handleUpdate({ options });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(localField.options || [])];
    options.splice(index, 1);
    handleUpdate({ options });
  };

  const needsOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(field.type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Field Properties
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-pink-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
        {/* Label */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Field Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={localField.label}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="Enter field label"
          />
        </div>

        {/* Placeholder */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Placeholder Text
          </label>
          <input
            type="text"
            value={localField.placeholder || ''}
            onChange={(e) => handleUpdate({ placeholder: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="Enter placeholder text"
          />
        </div>

        {/* Help Text */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Help Text
          </label>
          <textarea
            value={localField.helpText || ''}
            onChange={(e) => handleUpdate({ helpText: e.target.value })}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            placeholder="Additional instructions for this field"
          />
        </div>

        {/* Required Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-semibold text-gray-900">Required Field</div>
            <div className="text-sm text-gray-500">User must fill this field</div>
          </div>
          <button
            onClick={() => handleUpdate({ required: !localField.required })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localField.required ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localField.required ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Validation Rules */}
        {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
          <div className="space-y-4">
            <div className="font-semibold text-gray-900 flex items-center">
              <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Validation Rules
            </div>

            {field.type === 'number' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Value
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.min ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Value
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.max ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Length
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.minLength ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          minLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Length
                  </label>
                  <input
                    type="number"
                    value={localField.validation?.maxLength ?? ''}
                    onChange={(e) =>
                      handleUpdate({
                        validation: {
                          ...localField.validation,
                          maxLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>
            )}

            {field.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pattern (Regex)
                </label>
                <input
                  type="text"
                  value={localField.validation?.pattern ?? ''}
                  onChange={(e) =>
                    handleUpdate({
                      validation: {
                        ...localField.validation,
                        pattern: e.target.value || undefined,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  placeholder="^[A-Za-z]+$"
                />
              </div>
            )}
          </div>
        )}

        {/* Options for select/radio/checkbox */}
        {needsOptions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Options
              </div>
              <button
                onClick={handleAddOption}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Option
              </button>
            </div>

            <div className="space-y-2">
              {(localField.options || []).map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center space-x-2"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </div>

            {(!localField.options || localField.options.length === 0) && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No options yet. Click "Add Option" to create choices.
              </div>
            )}
          </div>
        )}

        {/* File Upload Settings */}
        {field.type === 'file' && (
          <div className="space-y-4">
            <div className="font-semibold text-gray-900 flex items-center">
              <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              File Upload Settings
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accepted File Types
              </label>
              <input
                type="text"
                value={localField.fileConfig?.acceptedTypes?.join(', ') || ''}
                onChange={(e) =>
                  handleUpdate({
                    fileConfig: {
                      ...localField.fileConfig,
                      acceptedTypes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="image/*, .pdf, .doc"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated MIME types or extensions</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max File Size (MB)
              </label>
              <input
                type="number"
                value={localField.fileConfig?.maxSize ? localField.fileConfig.maxSize / (1024 * 1024) : ''}
                onChange={(e) =>
                  handleUpdate({
                    fileConfig: {
                      ...localField.fileConfig,
                      maxSize: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 font-medium">
              Are you sure you want to delete this field?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Field
          </button>
        )}
      </div>
    </motion.div>
  );
}
