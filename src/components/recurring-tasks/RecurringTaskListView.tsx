import React from 'react';
import { RecurringTask } from '@/services/recurring-task.service';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, TrashIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

interface RecurringTaskListViewProps {
  tasks: RecurringTask[];
  onEdit: (task: RecurringTask) => void;
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  selected?: string[];
  onSelect?: (id: string) => void;
  canManageTasks?: boolean; // Whether user can edit/delete/pause tasks
  teamNames?: Record<string, string>; // Map of teamId to team name
}

/**
 * RecurringTaskListView Component
 * Displays recurring tasks in a table/list format
 */
export function RecurringTaskListView({
  tasks,
  onEdit,
  onDelete,
  onPause,
  onResume,
  selected = [],
  onSelect,
  canManageTasks = true, // Default to true for backward compatibility
  teamNames = {}, // Default to empty object
}: RecurringTaskListViewProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
          {onSelect && <div className="col-span-1">Select</div>}
          <div className={onSelect ? "col-span-3" : "col-span-3"}>Title</div>
          <div className="col-span-2">Pattern</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Next Occurrence</div>
          <div className="col-span-2">{canManageTasks ? 'Actions' : 'Team'}</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm transition-colors ${
                selected.includes(task.id!)
                  ? 'bg-blue-600/10 dark:bg-blue-600/20'
                  : 'bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {/* Select Checkbox */}
              {onSelect && (
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(task.id!)}
                    onChange={() => onSelect(task.id!)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              )}

              {/* Title */}
              <div className={onSelect ? "col-span-3" : "col-span-3"}>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {task.title}
                  {task.isPaused && (
                    <Badge variant="secondary" className="text-xs">
                      Paused
                    </Badge>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-1">
                  {task.description}
                </div>
              </div>

              {/* Recurrence Pattern */}
              <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
                {task.recurrencePattern}
              </div>

              {/* Status */}
              <div className="col-span-1 flex items-center">
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('-', ' ')}
                </Badge>
              </div>

              {/* Priority */}
              <div className="col-span-1 flex items-center">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>

              {/* Next Occurrence */}
              <div className="col-span-2">
                <div className="text-gray-700 dark:text-gray-300 flex items-center">
                  {formatDate(task.nextOccurrence)}
                </div>
              </div>

              {/* Actions or Team */}
              <div className="col-span-2 flex items-center gap-2">
                {canManageTasks ? (
                  <>
                    {task.isPaused ? (
                      <button
                        onClick={() => onResume(task.id!)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                        aria-label="Resume task"
                        title="Resume"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onPause(task.id!)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                        aria-label="Pause task"
                        title="Pause"
                      >
                        <PauseIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(task)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      aria-label="Edit task"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(task.id!)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                      aria-label="Delete task"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-gray-700 dark:text-gray-300">
                    {task.teamId && teamNames[task.teamId] ? (
                      <span className="text-sm font-medium">{teamNames[task.teamId]}</span>
                    ) : task.teamId ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">Team ID: {task.teamId}</span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500 italic">No team assigned</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card View - Visible only on mobile */}
      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 ${
              selected.includes(task.id!) ? 'ring-2 ring-primary' : ''
            }`}
          >
            {/* Title and Paused Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              {task.isPaused && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Paused
                </Badge>
              )}
            </div>

            {/* Status and Priority Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('-', ' ')}
              </Badge>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>

            {/* Task Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pattern:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {task.recurrencePattern}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Next Occurrence:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(task.nextOccurrence)}
                </span>
              </div>
              {!canManageTasks && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Team:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {task.teamId && teamNames[task.teamId] ? (
                      teamNames[task.teamId]
                    ) : task.teamId ? (
                      <span className="text-gray-500 dark:text-gray-400">Team ID: {task.teamId}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">No team assigned</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canManageTasks && (
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {task.isPaused ? (
                  <button
                    onClick={() => onResume(task.id!)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors min-h-[44px]"
                    aria-label="Resume task"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span className="text-sm">Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onPause(task.id!)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 transition-colors min-h-[44px]"
                    aria-label="Pause task"
                  >
                    <PauseIcon className="w-5 h-5" />
                    <span className="text-sm">Pause</span>
                  </button>
                )}
                <button
                  onClick={() => onEdit(task)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 transition-colors min-h-[44px]"
                  aria-label="Edit task"
                >
                  <PencilIcon className="w-5 h-5" />
                  <span className="text-sm">Edit</span>
                </button>
                <button
                  onClick={() => onDelete(task.id!)}
                  className="px-4 py-2.5 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors min-h-[44px]"
                  aria-label="Delete task"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
