'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Trash2, GripVertical, ChevronDown, Plus } from 'lucide-react';
import type { FormField, FormFieldType } from '@/types/form.types';
import { QuestionCard } from './QuestionCard';
import { QuestionTypeSelector } from './QuestionTypeSelector';

interface SectionCardProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFocus: () => void;
  onAddNestedField: (sectionId: string, type: FormFieldType) => void;
  onUpdateNestedField: (sectionId: string, fieldId: string, updates: Partial<FormField>) => void;
  onDeleteNestedField: (sectionId: string, fieldId: string) => void;
  onDuplicateNestedField: (sectionId: string, fieldId: string) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
}

export function SectionCard({
  field,
  index,
  isSelected,
  onUpdate,
  onDelete,
  onDuplicate,
  onFocus,
  onAddNestedField,
  onUpdateNestedField,
  onDeleteNestedField,
  onDuplicateNestedField,
  selectedFieldId,
  onSelectField,
}: SectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleDelete = () => {
    if (confirm('Delete this section and all questions within it?')) {
      onDelete();
    }
  };

  const nestedFields = field.fields || [];

  const nestedFieldIds = useMemo(
    () => nestedFields.map(f => f.id),
    [nestedFields]
  );

  const handleNestedDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = nestedFields.findIndex(f => f.id === active.id);
    const newIndex = nestedFields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...nestedFields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    reordered.forEach((f, i) => { f.order = i; });
    onUpdate({ fields: reordered });
  }, [nestedFields, onUpdate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white dark:bg-gray-800 rounded-lg border transition-all duration-150
        ${isSelected
          ? 'border-blue-400 dark:border-blue-500 shadow-md border-l-4 border-l-[#673ab7]'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Drag handle - center top */}
      <div
        {...attributes}
        {...listeners}
        className="flex justify-center py-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="7" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </div>

      <div className="px-6 pb-4">
        {/* Section Header */}
        <div className="flex items-start gap-3 cursor-pointer" onClick={onFocus}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mt-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <ChevronDown
              size={20}
              className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          </button>

          {isSelected ? (
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              placeholder="Section title"
              className="flex-1 text-lg font-semibold border-b-2 border-blue-500 focus:outline-none bg-transparent py-1 text-gray-900 dark:text-white"
            />
          ) : (
            <span className="flex-1 text-lg font-semibold text-gray-800 dark:text-white">
              {field.label || 'Section title'}
            </span>
          )}
        </div>

        {/* Section Description */}
        {isSelected && (
          <input
            type="text"
            value={field.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Section description (optional)"
            className="mt-2 w-full border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none text-sm py-0.5 bg-transparent text-gray-500 dark:text-gray-400"
          />
        )}
        {!isSelected && field.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{field.description}</p>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-200 dark:bg-gray-600 w-full my-3" />

        {/* Nested Questions */}
        {isExpanded && (
          <div className="space-y-3 ml-2">
            {nestedFields.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                <p className="text-sm">No questions in this section yet</p>
              </div>
            ) : (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleNestedDragEnd}
              >
                <SortableContext
                  items={nestedFieldIds}
                  strategy={verticalListSortingStrategy}
                >
                  {nestedFields.map((nestedField, nestedIndex) => (
                    <QuestionCard
                      key={nestedField.id}
                      field={nestedField}
                      index={nestedIndex}
                      isSelected={selectedFieldId === nestedField.id}
                      onUpdate={(updates) =>
                        onUpdateNestedField(field.id, nestedField.id, updates)
                      }
                      onDelete={() =>
                        onDeleteNestedField(field.id, nestedField.id)
                      }
                      onDuplicate={() =>
                        onDuplicateNestedField(field.id, nestedField.id)
                      }
                      onFocus={() => onSelectField(nestedField.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Add Question Button */}
            {isSelected && (
              <>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenu(!showAddMenu);
                    }}
                    className="w-full py-2 px-3 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#673ab7] text-gray-600 dark:text-gray-400 hover:text-[#673ab7] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Plus size={18} />
                    Add question to section
                  </button>

                  {/* Question Type Menu */}
                  {showAddMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[10001] p-2">
                      {(['text', 'textarea', 'email', 'phone', 'number', 'date', 'time', 'month', 'select', 'radio', 'checkbox', 'multiselect', 'file'] as FormFieldType[]).map((type) => (
                        <button
                          key={type}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddNestedField(field.id, type);
                            setShowAddMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 capitalize"
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Backdrop to close menu */}
                {showAddMenu && (
                  <div
                    className="fixed inset-0 z-[10000]"
                    onClick={() => setShowAddMenu(false)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Footer Actions - only show when selected */}
        {isSelected && (
          <div className="flex items-center justify-end gap-1 mt-5 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Duplicate"
            >
              <Copy size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
