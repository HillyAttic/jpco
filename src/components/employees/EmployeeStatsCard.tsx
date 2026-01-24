import React from 'react';
import { Employee } from '@/services/employee.service';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UsersIcon,
  UserIcon,
  ClockIcon,
  BuildingOfficeIcon
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

interface RoleItemProps {
  role: string;
  count: number;
  percentage: number;
}

function RoleItem({ role, count, percentage }: RoleItemProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-medium text-gray-700">{role}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">{count}</span>
        <div className="w-12 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * EmployeeStatsCard Component
 * Displays summary statistics for employees including total, active, and department distribution
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

  // Calculate role distribution
  const roleDistribution: Record<string, number> = {};
  employees.forEach(employee => {
    if (employee.role) {
      roleDistribution[employee.role] = 
        (roleDistribution[employee.role] || 0) + 1;
    }
  });

  // Sort roles by count (descending)
  const sortedRoles = Object.entries(roleDistribution)
    .sort(([, a], [, b]) => b - a);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Employee Overview</h2>
          <p className="text-xs text-gray-600 mt-0.5">Summary of all employee statuses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
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

        {/* Role Distribution */}
        {sortedRoles.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-900">Role Distribution</h3>
              <p className="text-xs text-gray-600">Employees by role</p>
            </div>
            
            <div className="space-y-1.5">
              {sortedRoles.map(([role, count]) => (
                <RoleItem
                  key={role}
                  role={role}
                  count={count}
                  percentage={totalEmployees > 0 ? (count / totalEmployees) * 100 : 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active Employee Rate */}
        {totalEmployees > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">Active Employee Rate</span>
              <span className="text-xs font-semibold text-gray-900">
                {Math.round((activeEmployees / totalEmployees) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(activeEmployees / totalEmployees) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}