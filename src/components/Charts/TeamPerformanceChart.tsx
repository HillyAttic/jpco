import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TeamMember {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
}

interface TeamPerformanceChartProps {
  teamMembers: TeamMember[];
}

// Mini pie chart component for each employee
function MiniPieChart({ completed, inProgress, pending }: { completed: number; inProgress: number; pending: number }) {
  const total = completed + inProgress + pending;
  
  if (total === 0) {
    return (
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <span className="text-xs text-gray-400">No tasks</span>
      </div>
    );
  }

  const completedPercent = (completed / total) * 100;
  const inProgressPercent = (inProgress / total) * 100;
  const pendingPercent = (pending / total) * 100;

  // Calculate angles for pie chart
  const completedAngle = (completedPercent / 100) * 360;
  const inProgressAngle = (inProgressPercent / 100) * 360;
  const pendingAngle = (pendingPercent / 100) * 360;

  // Create conic gradient
  const gradient = `conic-gradient(
    from 0deg,
    #22c55e 0deg ${completedAngle}deg,
    #f97316 ${completedAngle}deg ${completedAngle + inProgressAngle}deg,
    #eab308 ${completedAngle + inProgressAngle}deg ${completedAngle + inProgressAngle + pendingAngle}deg
  )`;

  return (
    <div 
      className="w-16 h-16 rounded-full"
      style={{ background: gradient }}
      title={`Completed: ${completed}, In Progress: ${inProgress}, Pending: ${pending}`}
    />
  );
}

export function TeamPerformanceChart({ teamMembers }: TeamPerformanceChartProps) {
  console.log('[TeamPerformanceChart] Rendering with teamMembers:', teamMembers?.length || 0);
  
  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-dark text-gray-950 dark:text-white shadow-sm">
      <CardHeader className="flex flex-col space-y-1.5 p-6">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Team Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {!teamMembers || teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No team members with assigned tasks yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Assign tasks to team members to see their performance here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Employee
                  </th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Total
                  </th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                    Pending
                  </th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                    In Progress
                  </th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                    Completed
                  </th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Overview
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => {
                  const totalTasks = member.tasksCompleted + member.tasksInProgress + member.tasksPending;
                  
                  return (
                    <tr 
                      key={member.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {member.name}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="text-xs text-gray-700 dark:text-gray-300">{totalTasks}</span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          {member.tasksPending}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          {member.tasksInProgress}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {member.tasksCompleted}
                        </span>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="flex justify-center">
                          <MiniPieChart 
                            completed={member.tasksCompleted}
                            inProgress={member.tasksInProgress}
                            pending={member.tasksPending}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
