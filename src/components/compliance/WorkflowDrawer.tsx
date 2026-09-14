'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WorkflowStep, WorkflowType, ReportTypeConfig } from '@/services/recurring-task.service';
import { calculateWorkflowProgress, getNextStep, getWorkflowTemplate } from '@/lib/workflow-templates';
import { authenticatedFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, X, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';

interface WorkflowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  workflowType: WorkflowType;
  steps: WorkflowStep[];          // step metadata (names, ids)
  completedStepIds: string[];     // which step IDs this client has completed
  /** Per-step completion metadata scoped to THIS client (keyed by stepId) */
  stepMeta?: Record<string, { completedAt?: any; completedBy?: string; remark?: string; remarkBy?: string; remarkAt?: any }>;
  assignee?: string;
  clientId?: string;
  clientName?: string;
  onStepToggle: (stepId: string, completed: boolean, clientId?: string, remark?: string) => Promise<void>;
  onMarkAllComplete?: (clientId?: string) => Promise<void>;
  onMarkAllIncomplete?: (clientId?: string) => Promise<void>;
  reportTypeConfig?: ReportTypeConfig; // Dynamic report type config for badge display
}

export function WorkflowDrawer({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  workflowType,
  steps,
  completedStepIds,
  stepMeta,
  assignee,
  clientId,
  clientName,
  onStepToggle,
  onMarkAllComplete,
  onMarkAllIncomplete,
  reportTypeConfig,
}: WorkflowDrawerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [remarkText, setRemarkText] = useState<Record<string, string>>({});
  const [expandedRemarkStep, setExpandedRemarkStep] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Use dynamic reportTypeConfig if provided, otherwise fall back to static template
  const template = reportTypeConfig || getWorkflowTemplate(workflowType);

  // Resolve UIDs to display names for completed steps
  useEffect(() => {
    if (!open || fetchedRef.current) return;

    const fetchNames = async () => {
      try {
        const res = await authenticatedFetch('/api/users/names');
        const data = await res.json();
        if (data && typeof data === 'object') {
          setUserNames(data);
          fetchedRef.current = true;
        }
      } catch {
        // Silently fail — fall back to showing UIDs
      }
    };

    fetchNames();
  }, [open]);

  const resolveUserName = (uid: string) => userNames[uid] || uid;

  // Build virtual steps using per-client completion state
  const virtualSteps: WorkflowStep[] = steps.map((s) => ({
    ...s,
    completed: completedStepIds.includes(s.id),
  }));

  const progress = calculateWorkflowProgress(virtualSteps);

  const handleStepToggle = async (stepId: string, completed: boolean) => {
    try {
      setLoading(stepId);
      const remark = completed ? (remarkText[stepId] || '').trim() || undefined : undefined;
      await onStepToggle(stepId, completed, clientId, remark);

      // Clear remark input after successful toggle
      setRemarkText(prev => {
        const next = { ...prev };
        delete next[stepId];
        return next;
      });
      setExpandedRemarkStep(null);

      toast.success(`Step ${completed ? 'completed' : 'reopened'}${clientName ? ` for ${clientName}` : ''}`);
    } catch (error) {
      toast.error('Failed to update step');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveRemark = async (stepId: string) => {
    try {
      setLoading(stepId);
      const remark = (remarkText[stepId] || '').trim() || undefined;
      await onStepToggle(stepId, true, clientId, remark);
      setRemarkText(prev => {
        const next = { ...prev };
        delete next[stepId];
        return next;
      });
      setExpandedRemarkStep(null);
      toast.success('Remark updated');
    } catch (error) {
      toast.error('Failed to update remark');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkAllComplete = async () => {
    try {
      setLoading('all');
      await onMarkAllComplete?.(clientId);
      toast.success('All steps completed');
    } catch (error) {
      toast.error('Failed to complete all steps');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkAllIncomplete = async () => {
    try {
      setLoading('all');
      await onMarkAllIncomplete?.(clientId);
      toast.success('All steps reopened');
    } catch (error) {
      toast.error('Failed to reopen all steps');
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    try {
      let d: Date;
      if (typeof date.toDate === 'function') {
        d = date.toDate();
      } else if (date.seconds !== undefined) {
        d = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        d = new Date(date);
      } else {
        d = date;
      }
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Read completion info from the PER-CLIENT step metadata (clientProgress.stepMeta)
  // so completion date/author and remarks are isolated per client. Falls back to
  // the shared step object only when no per-client metadata is available (legacy).
  const getStepCompletionInfo = (stepId: string) => {
    const meta = stepMeta?.[stepId];
    if (meta) {
      return {
        completedAt: meta.completedAt,
        completedBy: meta.completedBy,
        remark: meta.remark,
        remarkBy: meta.remarkBy,
        remarkAt: meta.remarkAt,
      };
    }
    const step = steps.find((s) => s.id === stepId);
    return {
      completedAt: step?.completedAt,
      completedBy: step?.completedBy,
      remark: step?.remark,
      remarkBy: step?.remarkBy,
      remarkAt: step?.remarkAt,
    };
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity pointer-events-none" />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden overscroll-contain my-auto">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b bg-white flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Badge className={template.badgeClass}>
                  {'badgeLabel' in template ? template.badgeLabel : template.label}
                </Badge>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  progress.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : progress.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {progress.status === 'completed' ? 'Completed' : progress.status === 'in-progress' ? 'In Progress' : 'Pending'}
                </span>
              </div>
              {clientName ? (
                <>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{clientName}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {taskTitle}
                    {assignee ? <> · Assigned to <span className="font-semibold">{assignee}</span></> : <> · <span className="text-gray-400">Unassigned</span></>}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{taskTitle}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {'fullName' in template ? template.fullName : template.description}
                    {assignee ? <> · Assigned to <span className="font-semibold">{assignee}</span></> : <> · <span className="text-gray-400">Unassigned</span></>}
                  </p>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-3">
            <Progress
              value={progress.percentage}
              className="flex-1 h-2"
              indicatorClassName={progress.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-700'}
            />
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
              {progress.completed} of {progress.total} · {progress.percentage}%
            </span>
          </div>
        </div>

        {/* Steps list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50">
          {virtualSteps.map((step, index) => {
            const info = getStepCompletionInfo(step.id);
            const hasRemark = !!info.remark;
            const isRemarkExpanded = expandedRemarkStep === step.id;

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all ${
                  step.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
              >
                {/* Step header row */}
                <div className="flex items-center gap-3 p-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-semibold text-sm truncate ${step.completed ? 'text-green-800' : 'text-gray-900'}`}>
                        {step.name}
                      </p>
                      {hasRemark && (
                        <MessageSquare className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.completed
                        ? `Completed ${formatDate(info.completedAt)}${info.completedBy ? ` · by ${resolveUserName(info.completedBy)}` : ''}`
                        : 'Not started'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Remark toggle button (only for completed steps) */}
                    {step.completed && (
                      <button
                        type="button"
                        onClick={() => setExpandedRemarkStep(isRemarkExpanded ? null : step.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isRemarkExpanded || hasRemark
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                            : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100'
                        }`}
                        title={hasRemark ? 'View/edit remark' : 'Add remark'}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    )}
                    <Switch
                      checked={step.completed}
                      onCheckedChange={(checked) => handleStepToggle(step.id, checked)}
                      disabled={loading === step.id}
                      className="flex-shrink-0"
                    />
                  </div>
                </div>

                {/* Expandable remark area */}
                {step.completed && isRemarkExpanded && (
                  <div className="px-3.5 pb-3.5 pt-0 ml-10">
                    <Textarea
                      placeholder="Add a remark (optional)..."
                      value={remarkText[step.id] ?? info.remark ?? ''}
                      onChange={(e) => setRemarkText(prev => ({ ...prev, [step.id]: e.target.value }))}
                      className="min-h-[60px] text-sm resize-none"
                      rows={2}
                    />
                    {hasRemark && info.remarkBy && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Last remark by {resolveUserName(info.remarkBy)}
                        {info.remarkAt ? ` · ${formatDate(info.remarkAt)}` : ''}
                      </p>
                    )}
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveRemark(step.id)}
                        disabled={loading === step.id}
                        className="text-xs"
                      >
                        {loading === step.id ? 'Saving...' : 'Save remark'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t bg-white flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-gray-500">
            {progress.status === 'completed'
              ? 'Workflow complete'
              : `${progress.total - progress.completed} step${progress.total - progress.completed !== 1 ? 's' : ''} remaining`}
          </p>
          <div className="flex items-center gap-2">
            {progress.status === 'completed' && onMarkAllIncomplete && (
              <Button
                variant="outline"
                onClick={handleMarkAllIncomplete}
                disabled={loading === 'all'}
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                {loading === 'all' ? 'Reopening...' : 'Untick all'}
              </Button>
            )}
            {progress.status !== 'completed' && onMarkAllComplete && (
              <Button
                variant="outline"
                onClick={handleMarkAllComplete}
                disabled={loading === 'all'}
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {loading === 'all' ? 'Completing...' : 'Mark all complete'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
