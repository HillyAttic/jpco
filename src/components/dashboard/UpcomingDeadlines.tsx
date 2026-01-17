import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Task } from '@/types/task.types';
import { CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UpcomingDeadlinesProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function UpcomingDeadlines({ tasks, onTaskClick }: UpcomingDeadlinesProps) {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingTasks = tasks
    .filter((task) => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const getDaysUntilDue = (dueDate: Date) => {
    const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-red-600 bg-red-50';
    if (days <= 3) return 'text-orange-600 bg-orange-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No upcoming deadlines</p>
          ) : (
            upcomingTasks.map((task) => {
              const daysUntil = getDaysUntilDue(task.dueDate!);
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task.id)}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(task.dueDate!).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getUrgencyColor(daysUntil)}`}>
                    {daysUntil <= 1 && <ExclamationTriangleIcon className="w-3 h-3" />}
                    <span className="text-xs font-medium whitespace-nowrap">
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
