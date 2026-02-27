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
      <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <span className="text-[7px] sm:text-xs text-gray-400">No</span>
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
      className="w-10 h-10 sm:w-16 sm:h-16 rounded-full flex-shrink-0"
      style={{ background: gradient }}
      title={`Completed: ${completed}, In Progress: ${inProgress}, Pending: ${pending}`}
    />
  );
}

export function TeamPerformanceChart({ teamMembers }: TeamPerformanceChartProps) {
  console.log('[TeamPerformanceChart] Rendering with teamMembers:', teamMembers?.length || 0);
  
  return (
    <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-dark text-gray-950 dark:text-white shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col space-y-1.5 p-3 sm:p-6">
        <CardTitle className="text-lg sm:text-2xl font-semibold leading-none tracking-tight">Team Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto">
        {!teamMembers || teamMembers.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No team members with assigned tasks yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Assign tasks to team members to see their performance here</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="inline-block min-w-full align-middle px-3 sm:px-0">
              <table className="w-full border-collapse table-auto">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-center py-2 px-1 text-[9px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Total
                    </th>
                    <th className="text-center py-2 px-1 text-[9px] sm:text-xs font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                      Pending
                    </th>
                    <th className="text-center py-2 px-1 text-[9px] sm:text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      In Progress
                    </th>
                    <th className="text-center py-2 px-1 text-[9px] sm:text-xs font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      Done
                    </th>
                    <th className="text-right sm:text-center py-2 px-1 text-[9px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Chart
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
                        <td className="py-1.5 px-1 sm:px-2 whitespace-nowrap">
                          <span className="text-[9px] sm:text-xs font-medium text-gray-900 dark:text-gray-100 block max-w-[70px] sm:max-w-none truncate">
                            {member.name}
                          </span>
                        </td>
                        <td className="py-1.5 px-1 text-center whitespace-nowrap">
                          <span className="text-[9px] sm:text-xs text-gray-700 dark:text-gray-300">{totalTasks}</span>
                        </td>
                        <td className="py-1.5 px-1 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {member.tasksPending}
                          </span>
                        </td>
                        <td className="py-1.5 px-1 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            {member.tasksInProgress}
                          </span>
                        </td>
                        <td className="py-1.5 px-1 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {member.tasksCompleted}
                          </span>
                        </td>
                        <td className="py-1.5 px-1 whitespace-nowrap">
                          <div className="flex justify-end sm:justify-center">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
