/**
 * Workflow Templates
 * Defines TAR and STAT workflow steps
 */

import { WorkflowStep, WorkflowType } from '@/services/recurring-task.service';

export interface WorkflowTemplate {
  type: WorkflowType;
  label: string;
  fullName: string;
  badgeClass: string;
  steps: Omit<WorkflowStep, 'id' | 'completed' | 'completedAt' | 'completedBy'>[];
}

// TAR (Tax Audit Report) - 7 steps
export const TAR_TEMPLATE: WorkflowTemplate = {
  type: 'TAR',
  label: 'Tax Audit Report',
  fullName: 'Tax Audit Report · Form 3CA/3CB–3CD',
  badgeClass: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  steps: [
    { name: 'Statutory Reconciliation', shortName: 'Stat Recon' },
    { name: 'Financial Review', shortName: 'Fin Review' },
    { name: 'Profit Evaluation', shortName: 'Profit Eval' },
    { name: 'Supervisor Sign-off', shortName: 'Sign-off' },
    { name: 'Financials Ready', shortName: 'Fins Ready' },
    { name: 'TAR Ready', shortName: 'TAR Ready' },
    { name: 'TAR Filed', shortName: 'TAR Filed' },
  ],
};

// STAT (Statutory Audit) - 10 steps
export const STAT_TEMPLATE: WorkflowTemplate = {
  type: 'STAT',
  label: 'Statutory Audit',
  fullName: 'Statutory Audit · AOC-4 & MGT-7 filing',
  badgeClass: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  steps: [
    { name: 'Statutory Reconciliation', shortName: 'Stat Recon' },
    { name: 'Financial Review', shortName: 'Fin Review' },
    { name: 'Profit Evaluation', shortName: 'Profit Eval' },
    { name: 'Supervisor Sign-off', shortName: 'Sign-off' },
    { name: 'Financials Ready', shortName: 'Fins Ready' },
    { name: 'Audit Report Ready', shortName: 'Audit Rep' },
    { name: 'AOC-4 Ready', shortName: 'AOC-4 Rdy' },
    { name: 'AOC-4 Filed', shortName: 'AOC-4 Filed' },
    { name: 'MGT-7 Ready', shortName: 'MGT-7 Rdy' },
    { name: 'MGT-7 Filed', shortName: 'MGT-7 Filed' },
  ],
};

// Get template by type
export function getWorkflowTemplate(type: WorkflowType): WorkflowTemplate {
  return type === 'TAR' ? TAR_TEMPLATE : STAT_TEMPLATE;
}

// Initialize workflow steps from template
export function initializeWorkflowSteps(type: WorkflowType): WorkflowStep[] {
  const template = getWorkflowTemplate(type);
  return template.steps.map((step, index) => ({
    id: `${type.toLowerCase()}-step-${index + 1}`,
    ...step,
    completed: false,
    completedAt: undefined,
    completedBy: undefined,
  }));
}

// Calculate workflow progress
export function calculateWorkflowProgress(steps: WorkflowStep[]): {
  total: number;
  completed: number;
  percentage: number;
  status: 'pending' | 'in-progress' | 'completed';
} {
  const total = steps.length;
  const completed = steps.filter((s) => s.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  let status: 'pending' | 'in-progress' | 'completed' = 'pending';
  if (completed === total && total > 0) {
    status = 'completed';
  } else if (completed > 0) {
    status = 'in-progress';
  }

  return { total, completed, percentage, status };
}

// Get next incomplete step
export function getNextStep(steps: WorkflowStep[]): WorkflowStep | null {
  return steps.find((s) => !s.completed) || null;
}
