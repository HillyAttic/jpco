'use client';

import React, { useState } from 'react';
import { 
  ClipboardDocumentListIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { SimpleStatCard } from './SimpleStatCard';
import { VirtualTaskList } from './VirtualTaskList';
import { useRouter } from 'next/navigation';

interface MobileDashboardProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  };
  tasks: any[];
  onLoadMore: () => void;
  hasMore: boolean;
}

/**
 * Mobile-optimized dashboard
 * - Minimal initial render
 * - Virtual scrolling for task lists
 * - Progressive disclosure of data
 */
export function MobileDashboard({ stats, tasks, onLoadMore, hasMore }: MobileDashboardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'stats' | 'tasks'>('stats');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredTasks = selectedStatus
    ? tasks.filter(t => t.status === selectedStatus)
    : tasks;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Stats Grid - Always visible */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <SimpleStatCard
            title="Total"
            value={stats.total}
            icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
            onClick={() => {
              setSelectedStatus(null);
              setActiveView('tasks');
            }}
            compact
          />
          <SimpleStatCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircleIcon className="w-5 h-5" />}
            onClick={() => {
              setSelectedStatus('completed');
              setActiveView('tasks');
            }}
            color="green"
            compact
          />
          <SimpleStatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<ClockIcon className="w-5 h-5" />}
            onClick={() => {
              setSelectedStatus('in-progress');
              setActiveView('tasks');
            }}
            color="orange"
            compact
          />
          <SimpleStatCard
            title="Overdue"
            value={stats.overdue}
            icon={<ExclamationTriangleIcon className="w-5 h-5" />}
            onClick={() => {
              setSelectedStatus('overdue');
              setActiveView('tasks');
            }}
            color="red"
            compact
          />
        </div>
      </div>

      {/* Task List - Lazy loaded */}
      {activeView === 'tasks' && (
        <div className="p-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {selectedStatus ? `${selectedStatus} Tasks` : 'All Tasks'}
              </h3>
              <button
                onClick={() => setActiveView('stats')}
                className="text-sm text-blue-600 dark:text-blue-400 mt-1"
              >
                ← Back to Stats
              </button>
            </div>
            <VirtualTaskList
              tasks={filteredTasks}
              onTaskClick={(taskId) => {
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                  router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`);
                }
              }}
            />
            {hasMore && (
              <div className="p-3 text-center">
                <button
                  onClick={onLoadMore}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => router.push('/tasks/non-recurring')}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <PlusCircleIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
