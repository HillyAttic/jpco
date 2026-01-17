import React from 'react';
import { Task } from '@/types/task.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  PencilSquareIcon, 
  TrashIcon, 
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

/**
 * TaskCard Component
 * Displays task information with priority badges, overdue indicators, and action buttons
 * Validates Requirements: 2.4, 2.5, 2.6, 2.9
 */
export function TaskCard({ task, onEdit, onDelete, onToggleComplete, selected = false, onSelect }: TaskCardProps) {
  // Check if task is overdue (Requirement 2.5)
  const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
  
  // Get priority badge variant and color (Requirement 2.9)
  const getPriorityVariant = (priority: string): 'success' | 'warning' | 'danger' => {
    switch (priority) {
      case 'low':
        return 'success'; // green
      case 'medium':
        return 'warning'; // yellow
      case 'high':
        return 'warning'; // orange (we'll customize this)
      case 'urgent':
        return 'danger'; // red
      default:
        return 'warning';
    }
  };

  // Get custom color classes for high priority (orange)
  const getPriorityClasses = (priority: string): string => {
    if (priority === 'high') {
      return 'border-transparent bg-orange-100 text-orange-800 hover:bg-orange-200';
    }
    return '';
  };

  // Generate initials for assignee avatars
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isCompleted = task.status === 'completed';

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${isOverdue ? 'border-red-300 bg-red-50/30' : ''} ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-6">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="absolute top-4 left-4 z-10">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(task.id, e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              aria-label={`Select ${task.title}`}
            />
          </div>
        )}
        
        {/* Header with Title and Priority Badge */}
        <div className={`flex items-start justify-between mb-3 ${onSelect ? 'ml-8' : ''}`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-lg font-semibold truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              {/* Priority Badge - Requirement 2.9 */}
              <Badge
                variant={getPriorityVariant(task.priority)}
                className={getPriorityClasses(task.priority)}
              >
                {task.priority.toUpperCase()}
              </Badge>
            </div>
            
            {/* Overdue Indicator - Requirement 2.5 */}
            {isOverdue && (
              <div className="flex items-center gap-1 text-red-600 text-sm font-medium mb-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span>Overdue</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(task)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              aria-label={`Edit ${task.title}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(task.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Delete ${task.title}`}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Description - Requirement 2.4 */}
        {task.description && (
          <p className={`text-sm mb-4 line-clamp-2 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
            {task.description}
          </p>
        )}

        {/* Task Details */}
        <div className="space-y-3 mb-4">
          {/* Due Date - Requirement 2.4 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              Due: {formatDate(task.dueDate)}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="w-4 h-4 flex-shrink-0 text-gray-600" />
            <Badge variant={isCompleted ? 'success' : 'info'}>
              {task.status.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </Badge>
          </div>

          {/* Assigned Users - Requirement 2.4 */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Assigned to:</span>
              <div className="flex -space-x-2">
                {task.assignedTo.slice(0, 3).map((userId, index) => (
                  <Avatar
                    key={userId}
                    fallback={getInitials(userId)}
                    size="sm"
                    className="border-2 border-white"
                  />
                ))}
                {task.assignedTo.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    +{task.assignedTo.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Complete/Incomplete Toggle - Requirement 2.6 */}
        <div className="pt-4 border-t">
          <Button
            variant={isCompleted ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => onToggleComplete(task.id)}
            className="w-full"
            aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isCompleted ? (
              <>
                <CheckCircleSolidIcon className="w-4 h-4 mr-2" />
                Completed
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>
        </div>

        {/* Footer with creation date */}
        {task.createdAt && (
          <div className="mt-4 text-xs text-gray-500">
            Created {new Date(task.createdAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
