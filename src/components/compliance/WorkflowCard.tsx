'use client';

import React from 'react';
import { WorkflowStep, WorkflowType } from '@/services/recurring-task.service';
import { calculateWorkflowProgress, getNextStep, getWorkflowTemplate } from '@/lib/workflow-templates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface WorkflowCardProps {
  taskId: string;
  taskTitle: string;
  workflowType: WorkflowType;
  steps: WorkflowStep[];          // step metadata (names, ids)
  completedStepIds: string[];     // which step IDs this client has completed
  onClick?: () => void;
  onAssign?: () => void;
  clientName?: string;
  clientId?: string;
  assignee?: string;
}

export function WorkflowCard({
  taskId,
  taskTitle,
  workflowType,
  steps,
  completedStepIds,
  onClick,
  onAssign,
  clientName,
  clientId,
  assignee,
}: WorkflowCardProps) {
  const template = getWorkflowTemplate(workflowType);

  // Build a virtual steps array for the progress calculator using per-client completion
  const virtualSteps: WorkflowStep[] = steps.map((s) => ({
    ...s,
    completed: completedStepIds.includes(s.id),
  }));

  const progress = calculateWorkflowProgress(virtualSteps);
  const nextStep = getNextStep(virtualSteps);

  const getStatusLabel = () => {
    switch (progress.status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  };

  const nextStepText = progress.status === 'completed'
    ? 'All steps complete'
    : nextStep
      ? `Next: ${nextStep.name}`
      : '';

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 hover:bg-blue-50/30 bg-white overflow-hidden w-full"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {clientName && clientName !== taskTitle ? (
              <>
                <h3 className="font-bold text-sm text-gray-900 truncate">{clientName}</h3>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{taskTitle}</p>
              </>
            ) : (
              <h3 className="font-bold text-sm text-gray-900 truncate">{taskTitle}</h3>
            )}
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {assignee ? (
                `Assigned to ${assignee}`
              ) : (
                <span
                  className="text-blue-600 hover:underline cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onAssign?.(); }}
                >
                  Unassigned
                </span>
              )}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${getStatusColor()}`}>
            {progress.status === 'pending' && <AlertCircle className="h-2.5 w-2.5" />}
            {getStatusLabel()}
          </span>
        </div>
        <Badge className={`mt-1 ${template.badgeClass}`}>
          {template.label}
        </Badge>
      </CardHeader>

      <CardContent className="p-3 pt-1 pb-1">
        {/* Progress bar with label */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Progress
              value={progress.percentage}
              className="h-1.5"
              indicatorClassName={progress.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-700'}
            />
          </div>
          <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap shrink-0">
            {progress.completed}/{progress.total} · {progress.percentage}%
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-1 flex items-center justify-between">
        <span className="text-xs text-gray-500 truncate min-w-0">
          {nextStepText || 'All steps complete'}
        </span>
        <Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-semibold text-xs gap-1 px-2 min-h-[44px] md:h-7 shrink-0">
          Update
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
