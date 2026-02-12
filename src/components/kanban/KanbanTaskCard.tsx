'use client';

import React from 'react';
import { KanbanTask } from '@/types/kanban.types';
import { Card } from '@/components/ui/card';
import { 
  CalendarIcon, 
  ChatBubbleLeftIcon, 
  PaperClipIcon,
  FlagIcon 
} from '@heroicons/react/24/outline';

interface KanbanTaskCardProps {
  task: KanbanTask;
  onDragStart: (e: React.DragEvent, task: KanbanTask) => void;
  onClick: (task: KanbanTask) => void;
}

export function KanbanTaskCard({ task, onDragStart, onClick }: KanbanTaskCardProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
      className="p-4 mb-3 cursor-move hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task);
        }
      }}
    >
      {/* Priority Flag */}
      {task.priority && (
        <div className="flex items-center gap-1 mb-2">
          <FlagIcon className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{task.priority}</span>
        </div>
      )}

      {/* Title */}
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {/* Assignee */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: task.assignee.avatarColor }}
            title={`${task.assignee.name} - ${task.assignee.role}`}
          >
            {task.assignee.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{task.assignee.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{task.assignee.role}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          {/* Due Date */}
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
            <CalendarIcon className="w-4 h-4" />
            <span className="text-xs">
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Comments */}
          {task.commentsCount !== undefined && task.commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span className="text-xs">{task.commentsCount}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachmentsCount !== undefined && task.attachmentsCount > 0 && (
            <div className="flex items-center gap-1">
              <PaperClipIcon className="w-4 h-4" />
              <span className="text-xs">{task.attachmentsCount}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
