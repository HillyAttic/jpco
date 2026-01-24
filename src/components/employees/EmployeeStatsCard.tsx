import React from 'react';
import { Employee } from '@/services/employee.service';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UsersIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface EmployeeStatsCardProps {
  employees: Employee[];
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function StatItem({ icon, label, value, color, bgColor }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${bgColor}`}>
        <div className={color}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
    </div>
  );
}

/**
 * EmployeeStatsCard Component
 * Displays summary statistics for employees including total, active, and on-leave counts
 * Validates Requirements: 5.9
 */
export function EmployeeStatsCard({ employees }: EmployeeStatsCardProps) {
  // Calculate statistics - Requirement 5.9
  const totalEmployees = employees.length;
  
  const activeEmployees = employees.filter(
    employee => employee.status === 'active'
  ).length;
  
  const onLeaveEmployees = employees.filter(
    employee => employee.status === 'on-leave'
  ).length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Employee Overview</h2>
          <p className="text-xs text-gray-600 mt-0.5">Summary of all employee statuses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Total Employees */}
          <StatItem
            icon={<UsersIcon className="w-5 h-5" />}
            label="Total Employees"
            value={totalEmployees}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />

          {/* Active Employees */}
          <StatItem
            icon={<UserIcon className="w-5 h-5" />}
            label="Active"
            value={activeEmployees}
            color="text-green-600"
            bgColor="bg-green-100"
          />

          {/* On Leave Employees */}
          <StatItem
            icon={<ClockIcon className="w-5 h-5" />}
            label="On Leave"
            value={onLeaveEmployees}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
        </div>
      </CardContent>
    </Card>
  );
}