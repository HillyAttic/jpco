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
import { CheckCircle2, X } from 'lucide-react';
import { toast } from 'react-toastify';

interface WorkflowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  workflowType: WorkflowType;
  steps: WorkflowStep[];          // step metadata (names, ids)
  completedStepIds: string[];     // which step IDs this client has completed
  assignee?: string;
  clientId?: string;
  clientName?: string;
  onStepToggle: (stepId: string, completed: boolean, clientId?: string) => Promise<void>;
  onMarkAllComplete?: (clientId?: string) => Promise<void>;
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
  assignee,
  clientId,
  clientName,
  onStepToggle,
  onMarkAllComplete,
  reportTypeConfig,
}: WorkflowDrawerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
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
      await onStepToggle(stepId, completed, clientId);
      toast.success(`Step ${completed ? 'completed' : 'reopened'}${clientName ? ` for ${clientName}` : ''}`);
    } catch (error) {
      toast.error('Failed to update step');
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
      });
    } catch {
      return '';
    }
  };

  // For display: show which step IDs are completed (from clientProgress)
  // We need completedAt/completedBy per step — fall back to legacy step data if available
  const getStepCompletionInfo = (stepId: string) => {
    const legacyStep = steps.find((s) => s.id === stepId);
    return {
      completedAt: legacyStep?.completedAt,
      completedBy: legacyStep?.completedBy,
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
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  step.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
              >
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
                  <p className={`font-semibold text-sm ${step.completed ? 'text-green-800' : 'text-gray-900'}`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step.completed
                      ? `Completed ${formatDate(info.completedAt)}${info.completedBy ? ` · by ${resolveUserName(info.completedBy)}` : ''}`
                      : 'Not started'}
                  </p>
                </div>

                <Switch
                  checked={step.completed}
                  onCheckedChange={(checked) => handleStepToggle(step.id, checked)}
                  disabled={loading === step.id}
                  className="flex-shrink-0"
                />
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
    </div>,
    document.body
  );
}
