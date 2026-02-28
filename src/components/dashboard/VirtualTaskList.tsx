'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdByName: string;
  assignedToNames: string[];
  isRecurring?: boolean;
}

interface VirtualTaskListProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  itemHeight?: number;
}

/**
 * Virtual scrolling task list for mobile performance
 * Only renders visible items + buffer
 */
export function VirtualTaskList({ 
  tasks, 
  onTaskClick,
  itemHeight = 120 
}: VirtualTaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(
    tasks.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 2
  );

  const visibleTasks = tasks.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = tasks.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ height: '100%', maxHeight: 'calc(80vh - 100px)' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleTasks.map((task, index) => {
            const actualIndex = startIndex + index;
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const now = new Date();
            const isOverdue = dueDate && dueDate < now && task.status !== 'completed';
            const daysUntilDue = dueDate 
              ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
              : null;

            return (
              <div
                key={task.id}
                className={`p-3 mb-2 border-2 rounded-lg cursor-pointer hover:border-blue-300 transition-colors ${
                  task.status === 'pending' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10' :
                  task.status === 'in-progress' ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10' :
                  'border-green-200 bg-green-50 dark:bg-green-900/10'
                }`}
                style={{ height: itemHeight - 8 }}
                onClick={() => onTaskClick(task.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {task.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        task.status === 'in-progress' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {task.status}
                      </span>
                      {task.isRecurring && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-medium">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {dueDate && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-red-600 font-semibold">
                          {Math.abs(daysUntilDue!)}d overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
