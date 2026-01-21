import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assignedTo?: string[];
  category?: string;
}

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  selected?: string[];
  onSelect?: (id: string) => void;
}

/**
 * TaskListView Component
 * Displays tasks in a table/list format
 */
export function TaskListView({ 
  tasks, 
  onEdit, 
  onDelete, 
  onToggleComplete,
  selected = [],
  onSelect
}: TaskListViewProps) {
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
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
        {onSelect && <div className="col-span-1">Select</div>}
        <div className={onSelect ? "col-span-3" : "col-span-4"}>Title</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1">Priority</div>
        <div className="col-span-2">Due Date</div>
        <div className="col-span-2">Assigned To</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`grid grid-cols-12 gap-4 px-6 py-4 text-sm transition-colors ${
              selected.includes(task.id)
                ? 'bg-blue-50 dark:bg-blue-900/30'
                : 'bg-white dark:bg-gray-dark hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {/* Select Checkbox */}
            {onSelect && (
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selected.includes(task.id)}
                  onChange={() => onSelect(task.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            )}

            {/* Title */}
            <div className={onSelect ? "col-span-3" : "col-span-4"}>
              <div className="font-medium text-gray-900 dark:text-white">
                {task.title}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-1">
                {task.description}
              </div>
            </div>

            {/* Status */}
            <div className="col-span-2 flex items-center">
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

            {/* Due Date */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
              {formatDate(task.dueDate)}
            </div>

            {/* Assigned To */}
            <div className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center">
              {task.assignedTo && task.assignedTo.length > 0 ? (
                <span className="truncate">{task.assignedTo.join(', ')}</span>
              ) : (
                <span className="text-gray-400">Unassigned</span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center gap-2">
              <button
                onClick={() => onToggleComplete(task.id)}
                className={`p-1 ${
                  task.status === 'completed'
                    ? 'text-green-600 hover:text-green-900 dark:text-green-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500'
                }`}
                aria-label="Toggle complete"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(task)}
                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                aria-label="Edit task"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                aria-label="Delete task"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
