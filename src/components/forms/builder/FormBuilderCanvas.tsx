'use client';

import React from 'react';
import type { FormField } from '@/types/form.types';
import { FieldEditor } from './FieldEditor';

interface FormBuilderCanvasProps {
  fields: FormField[];
  onUpdateField: (index: number, field: FormField) => void;
  onDeleteField: (index: number) => void;
  onReorderField: (fromIndex: number, direction: 'up' | 'down') => void;
}

export function FormBuilderCanvas({
  fields,
  onUpdateField,
  onDeleteField,
  onReorderField,
}: FormBuilderCanvasProps) {
  const [selectedFieldIndex, setSelectedFieldIndex] = React.useState<number | null>(null);

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fields List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Fields</h3>

          {sortedFields.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No fields yet</p>
              <p className="text-sm">Add fields from the palette on the right</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedFields.map((field, index) => {
                const actualIndex = fields.findIndex((f) => f.id === field.id);
                const isSelected = selectedFieldIndex === actualIndex;

                return (
                  <div
                    key={field.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFieldIndex(actualIndex)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-red-500 text-sm">*</span>
                          )}
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {field.type}
                          </span>
                        </div>
                        {field.helpText && (
                          <p className="text-sm text-gray-500 mt-1">
                            {field.helpText}
                          </p>
                        )}
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex flex-col space-y-1 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderField(actualIndex, 'up');
                          }}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ▲
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderField(actualIndex, 'down');
                          }}
                          disabled={index === sortedFields.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Field Editor */}
      <div className="lg:col-span-1">
        {selectedFieldIndex !== null && fields[selectedFieldIndex] ? (
          <FieldEditor
            field={fields[selectedFieldIndex]}
            onUpdate={(updatedField) => onUpdateField(selectedFieldIndex, updatedField)}
            onDelete={() => {
              onDeleteField(selectedFieldIndex);
              setSelectedFieldIndex(null);
            }}
            onClose={() => setSelectedFieldIndex(null)}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            <p>Select a field to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
}
