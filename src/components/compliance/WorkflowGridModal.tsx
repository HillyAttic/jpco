'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { RecurringTask, TeamMemberMapping, ReportTypeConfig } from '@/services/recurring-task.service';
import { WorkflowCard } from './WorkflowCard';
import { getClientCompletedStepIds } from '@/services/recurring-task.service';
import { TeamMemberMappingDialog } from '@/components/recurring-tasks/TeamMemberMappingDialog';
import { authenticatedFetch } from '@/lib/api-client';
import { toast } from 'react-toastify';
import { getReportTypes } from '@/lib/workflow-templates';

interface WorkflowGridModalProps {
  open: boolean;
  onClose: () => void;
  task: RecurringTask;
  /** Pre-filtered client entries for TAR workflows (legacy) */
  tarEntries?: { clientId: string; clientName: string; task: RecurringTask }[];
  /** Pre-filtered client entries for STAT workflows (legacy) */
  statEntries?: { clientId: string; clientName: string; task: RecurringTask }[];
  /** Dynamic entries keyed by report type ID */
  entriesByType?: Record<string, { clientId: string; clientName: string; task: RecurringTask }[]>;
  /** Called when "Update" is clicked on a specific client card */
  onCardUpdate: (task: RecurringTask, type: string, clientId: string, clientName: string) => void;
}

export function WorkflowGridModal({
  open,
  onClose,
  task,
  tarEntries = [],
  statEntries = [],
  entriesByType,
  onCardUpdate,
}: WorkflowGridModalProps) {
  // Build effective entries: use entriesByType if provided, else fall back to legacy tarEntries/statEntries
  const effectiveEntriesByType: Record<string, { entries: { clientId: string; clientName: string; task: RecurringTask }[]; reportType?: ReportTypeConfig }> = {};

  if (entriesByType && Object.keys(entriesByType).length > 0) {
    // Dynamic mode: entriesByType provided
    const reportTypes = getReportTypes(task);
    Object.entries(entriesByType).forEach(([typeId, entries]) => {
      const rt = reportTypes.find(r => r.id === typeId);
      effectiveEntriesByType[typeId] = { entries, reportType: rt };
    });
  } else {
    // Legacy mode: tarEntries/statEntries
    if (tarEntries.length > 0) {
      const reportTypes = getReportTypes(task);
      const tarRT = reportTypes.find(r => r.id === 'tar');
      effectiveEntriesByType['tar'] = { entries: tarEntries, reportType: tarRT };
    }
    if (statEntries.length > 0) {
      const reportTypes = getReportTypes(task);
      const statRT = reportTypes.find(r => r.id === 'stat');
      effectiveEntriesByType['stat'] = { entries: statEntries, reportType: statRT };
    }
  }

  const typeIds = Object.keys(effectiveEntriesByType);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  // Initialize expanded state for new types
  useEffect(() => {
    typeIds.forEach(id => {
      if (expandedTypes[id] === undefined) {
        setExpandedTypes(prev => ({ ...prev, [id]: true }));
      }
    });
  }, [typeIds.join(',')]);

  const toggleExpanded = (typeId: string) => {
    setExpandedTypes(prev => ({ ...prev, [typeId]: !prev[typeId] }));
  };

  // Team member mapping dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingTask, setMappingTask] = useState<RecurringTask | null>(null);
  const [mappingClientId, setMappingClientId] = useState<string>('');
  const [localTasks, setLocalTasks] = useState<Record<string, RecurringTask>>({});

  const handleAssignClick = (entryTask: RecurringTask) => {
    setMappingTask(entryTask);
    setMappingDialogOpen(true);
  };

  const handleMappingSave = async (mappings: TeamMemberMapping[]) => {
    if (!mappingTask?.id) return;
    try {
      await authenticatedFetch(`/api/recurring-tasks/${mappingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberMappings: mappings }),
      });
      // Update local task data
      setLocalTasks(prev => ({
        ...prev,
        [mappingTask.id!]: { ...mappingTask, teamMemberMappings: mappings },
      }));
      toast.success('Team member mapping saved');
    } catch {
      toast.error('Failed to save mapping');
    }
  };

  if (!open) return null;

  const totalEntries = typeIds.reduce((sum, id) => sum + effectiveEntriesByType[id].entries.length, 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity pointer-events-none" />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[90rem] max-h-[88vh] flex flex-col overflow-hidden overscroll-contain">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {task.title} — Workflows
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {task.recurrencePattern && `${task.recurrencePattern.charAt(0).toUpperCase() + task.recurrencePattern.slice(1)} · `}
              {typeIds.length > 0 ? `${typeIds.length} workflow type${typeIds.length > 1 ? 's' : ''}` : 'No workflows'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* Dynamic workflow sections */}
          {typeIds.map((typeId) => {
            const { entries, reportType } = effectiveEntriesByType[typeId];
            const isExpanded = expandedTypes[typeId] !== false;
            const sectionName = reportType?.name || typeId.toUpperCase();
            const badgeClass = reportType?.badgeClass || 'bg-gray-100 text-gray-700';
            const badgeLabel = reportType?.badgeLabel || typeId.toUpperCase();
            const steps = reportType?.steps || [];

            return (
              <div key={typeId}>
                <button
                  onClick={() => toggleExpanded(typeId)}
                  className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  {sectionName}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    ({entries.length})
                  </span>
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {entries.map((entry, index) => {
                      const currentTask = localTasks[entry.task.id!] || entry.task;
                      const completedStepIds = getClientCompletedStepIds(currentTask, entry.clientId, typeId);
                      const mapping = currentTask.teamMemberMappings?.find(m => m.clientIds.includes(entry.clientId));
                      // Get steps from reportType or fallback to task fields
                      const entrySteps = steps.length > 0 ? steps
                        : typeId === 'tar' ? (currentTask.tarSteps || [])
                        : typeId === 'stat' ? (currentTask.statSteps || [])
                        : [];
                      return (
                        <WorkflowCard
                          key={`${typeId}-${entry.clientId}-${entry.task.id}-${index}`}
                          taskId={currentTask.id!}
                          taskTitle={currentTask.title}
                          clientName={entry.clientName}
                          clientId={entry.clientId}
                          workflowType={typeId}
                          steps={entrySteps}
                          completedStepIds={completedStepIds}
                          assignee={mapping?.userName}
                          reportTypeConfig={reportType}
                          onClick={() => onCardUpdate(currentTask, typeId, entry.clientId, entry.clientName)}
                          onAssign={() => handleAssignClick(currentTask)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {typeIds.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">No workflow types enabled for this task.</p>
            </div>
          )}
        </div>
      </div>

      {/* Team Member Mapping Dialog */}
      {mappingTask && (
        <TeamMemberMappingDialog
          isOpen={mappingDialogOpen}
          onClose={() => { setMappingDialogOpen(false); setMappingTask(null); }}
          onSave={handleMappingSave}
          initialMappings={mappingTask.teamMemberMappings || []}
          defaultClientFilter={mappingTask.clientFilter || 'all'}
        />
      )}
    </div>,
    document.body
  );
}
