'use client';

import React, { useState, useEffect } from 'react';
import { ReportTypeConfig, WorkflowStep } from '@/services/recurring-task.service';
import { BADGE_PRESETS } from '@/lib/workflow-templates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ReportTypeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  reportTypes: ReportTypeConfig[];
  onSave: (reportTypes: ReportTypeConfig[]) => void;
}

/** Generate a unique step ID prefixed with the report type ID */
function generateStepId(reportTypeId: string, existingSteps: WorkflowStep[]): string {
  const idx = existingSteps.length + 1;
  return `${reportTypeId}-step-${idx}`;
}

export function ReportTypeEditor({
  isOpen,
  onClose,
  reportTypes,
  onSave,
}: ReportTypeEditorProps) {
  const [localTypes, setLocalTypes] = useState<ReportTypeConfig[]>([]);
  const [editingType, setEditingType] = useState<ReportTypeConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBadgeLabel, setEditBadgeLabel] = useState('');
  const [editBadgeClass, setEditBadgeClass] = useState(BADGE_PRESETS[0].class);
  const [editDescription, setEditDescription] = useState('');
  const [editSteps, setEditSteps] = useState<WorkflowStep[]>([]);

  // Sync local state when reportTypes prop changes
  useEffect(() => {
    if (isOpen) {
      setLocalTypes(reportTypes.map(rt => ({ ...rt, steps: rt.steps.map(s => ({ ...s })) })));
      setEditingType(null);
      setIsEditing(false);
    }
  }, [isOpen, reportTypes]);

  const handleAddNew = () => {
    const newId = `custom-${Date.now()}`;
    const newType: ReportTypeConfig = {
      id: newId,
      name: 'New Report Type',
      badgeLabel: 'NEW',
      badgeClass: BADGE_PRESETS[0].class,
      description: 'Description',
      enabled: true,
      steps: [],
    };
    setEditingType(newType);
    setIsEditing(true);
    setEditName(newType.name);
    setEditBadgeLabel(newType.badgeLabel);
    setEditBadgeClass(newType.badgeClass);
    setEditDescription(newType.description);
    setEditSteps([]);
  };

  const handleEditType = (type: ReportTypeConfig) => {
    setEditingType(type);
    setIsEditing(true);
    setEditName(type.name);
    setEditBadgeLabel(type.badgeLabel);
    setEditBadgeClass(type.badgeClass);
    setEditDescription(type.description);
    setEditSteps(type.steps.map(s => ({ ...s })));
  };

  const handleSaveEdit = () => {
    if (!editingType) return;

    const updatedType: ReportTypeConfig = {
      ...editingType,
      name: editName || editingType.name,
      badgeLabel: editBadgeLabel || editingType.badgeLabel,
      badgeClass: editBadgeClass,
      description: editDescription,
      steps: editSteps,
    };

    const exists = localTypes.find(rt => rt.id === editingType.id);
    if (exists) {
      setLocalTypes(prev => prev.map(rt => rt.id === editingType.id ? updatedType : rt));
    } else {
      setLocalTypes(prev => [...prev, updatedType]);
    }

    setEditingType(null);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setIsEditing(false);
  };

  const handleDeleteType = (typeId: string) => {
    setLocalTypes(prev => prev.filter(rt => rt.id !== typeId));
  };

  const handleToggleType = (typeId: string, enabled: boolean) => {
    setLocalTypes(prev => prev.map(rt => rt.id === typeId ? { ...rt, enabled } : rt));
  };

  // Step management
  const handleAddStep = () => {
    if (!editingType) return;
    const newStep: WorkflowStep = {
      id: generateStepId(editingType.id, editSteps),
      name: 'New Step',
      shortName: 'New',
      completed: false,
    };
    setEditSteps(prev => [...prev, newStep]);
  };

  const handleUpdateStep = (stepId: string, field: 'name' | 'shortName', value: string) => {
    setEditSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s));
  };

  const handleRemoveStep = (stepId: string) => {
    setEditSteps(prev => prev.filter(s => s.id !== stepId));
  };

  const handleSaveAll = () => {
    onSave(localTypes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            )}
            {isEditing ? (editingType?.id && localTypes.find(rt => rt.id === editingType.id) ? 'Edit Report Type' : 'New Report Type') : 'Manage Report Types'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {!isEditing ? (
            /* ── List View ─────────────────────────────────── */
            <div className="space-y-3 py-2">
              {localTypes.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No report types configured. Add one to get started.
                </p>
              )}

              {localTypes.map((rt) => (
                <div
                  key={rt.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {rt.name}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rt.badgeClass}`}>
                        {rt.badgeLabel}
                      </span>
                      {!rt.enabled && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">(disabled)</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {rt.description} · {rt.steps.length} steps
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      type="button"
                      onClick={() => handleToggleType(rt.id, !rt.enabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        rt.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          rt.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditType(rt)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteType(rt.id)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Report Type
              </button>
            </div>
          ) : (
            /* ── Edit View ─────────────────────────────────── */
            <div className="space-y-4 py-2">
              {/* Name */}
              <div>
                <Label htmlFor="rt-name" className="text-sm font-medium">Name</Label>
                <Input
                  id="rt-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., Tax Audit Reports"
                  className="mt-1"
                />
              </div>

              {/* Badge Label */}
              <div>
                <Label htmlFor="rt-badge" className="text-sm font-medium">Badge Label</Label>
                <Input
                  id="rt-badge"
                  value={editBadgeLabel}
                  onChange={(e) => setEditBadgeLabel(e.target.value.toUpperCase())}
                  placeholder="e.g., TAX"
                  className="mt-1"
                  maxLength={10}
                />
              </div>

              {/* Badge Color */}
              <div>
                <Label className="text-sm font-medium">Badge Color</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {BADGE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditBadgeClass(preset.class)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${preset.class} ${
                        editBadgeClass === preset.class
                          ? 'ring-2 ring-offset-1 ring-blue-500'
                          : 'opacity-70 hover:opacity-100'
                      } transition-all`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="rt-desc" className="text-sm font-medium">Description</Label>
                <Input
                  id="rt-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g., Tax Audit Report"
                  className="mt-1"
                />
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Workflow Steps ({editSteps.length})</Label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {editSteps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
                    >
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={step.name}
                        onChange={(e) => handleUpdateStep(step.id, 'name', e.target.value)}
                        placeholder="Full name"
                        className="flex-1 h-7 text-xs"
                      />
                      <Input
                        value={step.shortName}
                        onChange={(e) => handleUpdateStep(step.id, 'shortName', e.target.value)}
                        placeholder="Short"
                        className="w-20 h-7 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(step.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors shrink-0"
                        title="Remove step"
                      >
                        <XMarkIcon className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}

                  {editSteps.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                      No steps yet. Click "Add Step" to create one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {isEditing ? (
            <Button onClick={handleSaveEdit} className="text-white">
              <CheckIcon className="h-4 w-4 mr-1" />
              Save Report Type
            </Button>
          ) : (
            <Button onClick={handleSaveAll} className="text-white">
              Save All Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
