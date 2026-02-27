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
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  CalendarIcon,
  Squares2X2Icon,
  BuildingOfficeIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  
  // Only show Quick Actions to admin/manager roles
  if (!isAdminOrManager) {
    return null;
  }

  const actions = [
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
      label: 'Projects',
      icon: <FolderIcon className="w-5 h-5" />,
      onClick: onManageProjects,
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      label: 'View Roster',
      icon: <CalendarDaysIcon className="w-5 h-5" />,
      onClick: () => router.push('/roster/view-schedule'),
      color: 'bg-teal-600 hover:bg-teal-700'
    },
    {
      label: 'Reports',
      icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />,
      onClick: onViewReports,
      color: 'bg-cyan-600 hover:bg-cyan-700'
    },
    {
      label: 'Attendance Sheet',
      icon: <ClockIcon className="w-5 h-5" />,
      onClick: () => router.push('/admin/attendance-roster'),
      color: 'bg-pink-600 hover:bg-pink-700'
    },
    {
      label: 'Client Visits',
      icon: <MapPinIcon className="w-5 h-5" />,
      onClick: () => router.push('/admin/client-visits'),
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      label: 'Leave Approvals',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      onClick: () => router.push('/admin/leave-approvals'),
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      label: 'Compliance',
      icon: <CalendarIcon className="w-5 h-5" />,
      onClick: () => router.push('/calendar'),
      color: 'bg-red-600 hover:bg-red-700'
    },
    {
      label: 'Kanban',
      icon: <Squares2X2Icon className="w-5 h-5" />,
      onClick: () => router.push('/kanban'),
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      label: 'Clients',
      icon: <BuildingOfficeIcon className="w-5 h-5" />,
      onClick: () => router.push('/clients'),
      color: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      label: 'Employees',
      icon: <UsersIcon className="w-5 h-5" />,
      onClick: () => router.push('/employees'),
      color: 'bg-violet-600 hover:bg-violet-700'
    }
  ];

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
