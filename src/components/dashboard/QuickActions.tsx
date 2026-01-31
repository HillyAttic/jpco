import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircleIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface QuickActionsProps {
  onCreateTask?: () => void;
  onViewTeam?: () => void;
  onViewAnalytics?: () => void;
  onManageProjects?: () => void;
  onViewRoster?: () => void;
  onViewReports?: () => void;
  onViewAttendance?: () => void;
  isAdminOrManager?: boolean;
}

export function QuickActions({
  onCreateTask,
  onViewTeam,
  onViewAnalytics,
  onManageProjects,
  onViewRoster,
  onViewReports,
  onViewAttendance,
  isAdminOrManager = false,
}: QuickActionsProps) {
  const baseActions = [
    {
      label: 'Create Task',
      icon: <PlusCircleIcon className="w-5 h-5" />,
      onClick: onCreateTask,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      label: 'View Team',
      icon: <UserGroupIcon className="w-5 h-5" />,
      onClick: onViewTeam,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      label: 'Analytics',
      icon: <ChartBarIcon className="w-5 h-5" />,
      onClick: onViewAnalytics,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      label: 'Projects',
      icon: <FolderIcon className="w-5 h-5" />,
      onClick: onManageProjects,
      color: 'bg-indigo-600 hover:bg-indigo-700'
    }
  ];

  const adminActions = [
    {
      label: 'Roster',
      icon: <CalendarDaysIcon className="w-5 h-5" />,
      onClick: onViewRoster,
      color: 'bg-teal-600 hover:bg-teal-700'
    },
    {
      label: 'Reports',
      icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />,
      onClick: onViewReports,
      color: 'bg-cyan-600 hover:bg-cyan-700'
    },
    {
      label: 'Attendance',
      icon: <ClockIcon className="w-5 h-5" />,
      onClick: onViewAttendance,
      color: 'bg-pink-600 hover:bg-pink-700'
    }
  ];

  const actions = isAdminOrManager ? [...baseActions, ...adminActions] : baseActions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              className={`${action.color} text-white flex items-center justify-center gap-2 py-3`}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
