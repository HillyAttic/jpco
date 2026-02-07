'use client';

import React from 'react';
import { Task } from '@/types/task.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  showStatus?: boolean;
}

export function TaskList({ tasks, onTaskClick, showStatus = true }: TaskListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-orange-100 text-orange-800';
      case 'todo':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'in-progress':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'todo':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No tasks found</h3>
        <p className="text-gray-500">Get started by creating a new task.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onTaskClick?.(task)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {task.title}
                  </h3>
                  {showStatus && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1 capitalize">{task.status.replace('-', ' ')}</span>
                    </span>
                  )}
                </div>
                
                {task.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                        <span className="text-xs font-medium text-gray-700">
                          {task.assignedTo[0].charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>{task.assignedTo[0]}</span>
                    </div>
                  )}
                  
                  {task.dueDate && (
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  )}
                  
                  {task.priority && (
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </div>
                  )}
                </div>
              </div>
              
              {task.commentCount !== undefined && task.commentCount > 0 && (
                <div className="ml-4 flex-shrink-0">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                    {task.commentCount} comments
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}