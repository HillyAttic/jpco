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
    #3b82f6 ${completedAngle + inProgressAngle}deg ${completedAngle + inProgressAngle + pendingAngle}deg
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
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Employee Productivity (Completed Tasks)</CardTitle>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Tasks</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pending Tasks</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Completed Tasks</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Task Overview</th>
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
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{totalTasks}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{member.tasksPending}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{member.tasksCompleted}</span>
                      </td>
                      <td className="py-4 px-4">
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

            {/* Legend */}
            <div className="flex justify-center gap-6 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
