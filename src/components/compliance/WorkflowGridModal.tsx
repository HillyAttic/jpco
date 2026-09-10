'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { RecurringTask, TeamMemberMapping } from '@/services/recurring-task.service';
import { WorkflowCard } from './WorkflowCard';
import { getClientCompletedStepIds } from '@/services/recurring-task.service';
import { TeamMemberMappingDialog } from '@/components/recurring-tasks/TeamMemberMappingDialog';
import { authenticatedFetch } from '@/lib/api-client';
import { toast } from 'react-toastify';

interface WorkflowGridModalProps {
  open: boolean;
  onClose: () => void;
  task: RecurringTask;
  /** Pre-filtered client entries for TAR workflows */
  tarEntries: { clientId: string; clientName: string; task: RecurringTask }[];
  /** Pre-filtered client entries for STAT workflows */
  statEntries: { clientId: string; clientName: string; task: RecurringTask }[];
  /** Called when "Update" is clicked on a specific client card */
  onCardUpdate: (task: RecurringTask, type: 'TAR' | 'STAT', clientId: string, clientName: string) => void;
}

export function WorkflowGridModal({
  open,
  onClose,
  task,
  tarEntries,
  statEntries,
  onCardUpdate,
}: WorkflowGridModalProps) {
  const [tarExpanded, setTarExpanded] = useState(true);
  const [statExpanded, setStatExpanded] = useState(true);

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

  const hasTar = tarEntries.length > 0;
  const hasStat = statEntries.length > 0;

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
              {hasTar && hasStat ? 'TAR & STAT workflows' : hasTar ? 'TAR workflows' : 'STAT workflows'}
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
          {/* TAR Workflows — collapsible, collapsed by default */}
          {hasTar && (
            <div>
              <button
                onClick={() => setTarExpanded(prev => !prev)}
                className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
              >
                {tarExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                TAR Workflows
                <span className="text-sm font-normal text-gray-500">
                  ({tarEntries.length})
                </span>
              </button>
              {tarExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tarEntries.map((entry, index) => {
                    const currentTask = localTasks[entry.task.id!] || entry.task;
                    const completedStepIds = getClientCompletedStepIds(currentTask, entry.clientId, 'TAR');
                    const mapping = currentTask.teamMemberMappings?.find(m => m.clientIds.includes(entry.clientId));
                    return (
                      <WorkflowCard
                        key={`tar-${entry.clientId}-${entry.task.id}-${index}`}
                        taskId={currentTask.id!}
                        taskTitle={currentTask.title}
                        clientName={entry.clientName}
                        clientId={entry.clientId}
                        workflowType="TAR"
                        steps={currentTask.tarSteps || []}
                        completedStepIds={completedStepIds}
                        assignee={mapping?.userName}
                        onClick={() => onCardUpdate(currentTask, 'TAR', entry.clientId, entry.clientName)}
                        onAssign={() => handleAssignClick(currentTask)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STAT Workflows — collapsible, collapsed by default */}
          {hasStat && (
            <div>
              <button
                onClick={() => setStatExpanded(prev => !prev)}
                className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
              >
                {statExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                STAT Workflows
                <span className="text-sm font-normal text-gray-500">
                  ({statEntries.length})
                </span>
              </button>
              {statExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {statEntries.map((entry, index) => {
                    const currentTask = localTasks[entry.task.id!] || entry.task;
                    const completedStepIds = getClientCompletedStepIds(currentTask, entry.clientId, 'STAT');
                    const mapping = currentTask.teamMemberMappings?.find(m => m.clientIds.includes(entry.clientId));
                    return (
                      <WorkflowCard
                        key={`stat-${entry.clientId}-${entry.task.id}-${index}`}
                        taskId={currentTask.id!}
                        taskTitle={currentTask.title}
                        clientName={entry.clientName}
                        clientId={entry.clientId}
                        workflowType="STAT"
                        steps={currentTask.statSteps || []}
                        completedStepIds={completedStepIds}
                        assignee={mapping?.userName}
                        onClick={() => onCardUpdate(currentTask, 'STAT', entry.clientId, entry.clientName)}
                        onAssign={() => handleAssignClick(currentTask)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasTar && !hasStat && (
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
        />
      )}
    </div>,
    document.body
  );
}
