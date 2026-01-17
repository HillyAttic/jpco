import React from 'react';
import { Employee } from '@/services/employee.service';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UsersIcon,
  UserIcon,
  ClockIcon,
  UserMinusIcon,
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
    <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${bgColor}`}>
        <div className={color}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  );
}

interface DepartmentItemProps {
  department: string;
  count: number;
  percentage: number;
}

function DepartmentItem({ department, count, percentage }: DepartmentItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{department}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{count}</span>
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
  
  const terminatedEmployees = employees.filter(
    employee => employee.status === 'terminated'
  ).length;

  // Calculate department distribution
  const departmentDistribution: Record<string, number> = {};
  employees.forEach(employee => {
    if (employee.department) {
      departmentDistribution[employee.department] = 
        (departmentDistribution[employee.department] || 0) + 1;
    }
  });

  // Sort departments by count (descending)
  const sortedDepartments = Object.entries(departmentDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Show top 5 departments

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Employee Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Summary of all employee statuses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Employees */}
          <StatItem
            icon={<UsersIcon className="w-6 h-6" />}
            label="Total Employees"
            value={totalEmployees}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />

          {/* Active Employees */}
          <StatItem
            icon={<UserIcon className="w-6 h-6" />}
            label="Active"
            value={activeEmployees}
            color="text-green-600"
            bgColor="bg-green-100"
          />

          {/* On Leave Employees */}
          <StatItem
            icon={<ClockIcon className="w-6 h-6" />}
            label="On Leave"
            value={onLeaveEmployees}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />

          {/* Terminated Employees */}
          <StatItem
            icon={<UserMinusIcon className="w-6 h-6" />}
            label="Terminated"
            value={terminatedEmployees}
            color="text-red-600"
            bgColor="bg-red-100"
          />
        </div>

        {/* Department Distribution */}
        {sortedDepartments.length > 0 && (
          <div className="pt-6 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Department Distribution</h3>
              <p className="text-sm text-gray-600">Top departments by employee count</p>
            </div>
            
            <div className="space-y-2">
              {sortedDepartments.map(([department, count]) => (
                <DepartmentItem
                  key={department}
                  department={department}
                  count={count}
                  percentage={totalEmployees > 0 ? (count / totalEmployees) * 100 : 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active Employee Rate */}
        {totalEmployees > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Active Employee Rate</span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round((activeEmployees / totalEmployees) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(activeEmployees / totalEmployees) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}