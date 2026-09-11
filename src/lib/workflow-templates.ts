/**
 * Workflow Templates
 * Defines TAR and STAT workflow steps
 */

import { WorkflowStep, WorkflowType, RecurringTask, ReportTypeConfig } from '@/services/recurring-task.service';

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

// ── Dynamic report type helpers ───────────────────────────────────────

/** Badge color presets for the ReportTypeEditor */
export const BADGE_PRESETS = [
  { label: 'Purple', class: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
  { label: 'Teal', class: 'bg-teal-100 text-teal-700 hover:bg-teal-100' },
  { label: 'Blue', class: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  { label: 'Green', class: 'bg-green-100 text-green-700 hover:bg-green-100' },
  { label: 'Orange', class: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  { label: 'Red', class: 'bg-red-100 text-red-700 hover:bg-red-100' },
  { label: 'Pink', class: 'bg-pink-100 text-pink-700 hover:bg-pink-100' },
  { label: 'Amber', class: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
];

/**
 * Get the effective report types for a task.
 * If reportTypes is set and non-empty, use it.
 * Otherwise, synthesize from legacy tarEnabled/statEnabled fields.
 */
export function getReportTypes(task: RecurringTask): ReportTypeConfig[] {
  if (task.reportTypes && task.reportTypes.length > 0) {
    return task.reportTypes;
  }
  // Fallback: synthesize from legacy fields
  const types: ReportTypeConfig[] = [];
  if (task.tarEnabled) {
    types.push({
      id: 'tar',
      name: 'TAR Reports',
      badgeLabel: 'TAX AUDIT',
      badgeClass: TAR_TEMPLATE.badgeClass,
      description: TAR_TEMPLATE.label,
      enabled: true,
      steps: task.tarSteps || initializeWorkflowSteps('TAR'),
    });
  }
  if (task.statEnabled) {
    types.push({
      id: 'stat',
      name: 'Statutory Reports',
      badgeLabel: 'STATUTORY AUDIT',
      badgeClass: STAT_TEMPLATE.badgeClass,
      description: STAT_TEMPLATE.label,
      enabled: true,
      steps: task.statSteps || initializeWorkflowSteps('STAT'),
    });
  }
  return types;
}

/** Get a specific report type config by its ID from a task (case-insensitive). */
export function getReportTypeById(task: RecurringTask, typeId: string): ReportTypeConfig | undefined {
  const lower = typeId.toLowerCase();
  return getReportTypes(task).find(rt => rt.id.toLowerCase() === lower);
}

/** Get the workflow steps for a specific report type from a task. */
export function getStepsForReportType(task: RecurringTask, typeId: string): WorkflowStep[] {
  const reportType = getReportTypeById(task, typeId);
  if (reportType) return reportType.steps;
  // Legacy fallback (case-insensitive)
  const lower = typeId.toLowerCase();
  if (lower === 'tar') return task.tarSteps || [];
  if (lower === 'stat') return task.statSteps || [];
  return [];
}

/**
 * Get template-like info for any report type (including custom ones).
 * Returns the ReportTypeConfig if found, otherwise falls back to static template.
 */
export function getReportTypeDisplay(task: RecurringTask, typeId: string): { label: string; badgeClass: string; badgeLabel: string; steps: { name: string; shortName: string }[] } {
  const reportType = getReportTypeById(task, typeId);
  if (reportType) {
    return {
      label: reportType.description,
      badgeClass: reportType.badgeClass,
      badgeLabel: reportType.badgeLabel,
      steps: reportType.steps,
    };
  }
  // Legacy fallback
  const template = getWorkflowTemplate(typeId as WorkflowType);
  return {
    label: template.label,
    badgeClass: template.badgeClass,
    badgeLabel: typeId.toUpperCase(),
    steps: template.steps,
  };
}
