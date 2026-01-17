import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TeamMember {
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
}

interface TeamPerformanceChartProps {
  teamMembers: TeamMember[];
}

export function TeamPerformanceChart({ teamMembers }: TeamPerformanceChartProps) {
  const maxTasks = Math.max(
    ...teamMembers.map((m) => m.tasksCompleted + m.tasksInProgress),
    10
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No team data available</p>
          ) : (
            teamMembers.map((member, index) => {
              const totalTasks = member.tasksCompleted + member.tasksInProgress;
              const completedPercent = maxTasks > 0 ? (member.tasksCompleted / maxTasks) * 100 : 0;
              const inProgressPercent = maxTasks > 0 ? (member.tasksInProgress / maxTasks) * 100 : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{member.name}</span>
                    <span className="text-sm text-gray-500">
                      {totalTasks} task{totalTasks !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="relative w-full h-8 bg-gray-100 rounded-lg overflow-hidden">
                    {/* Completed tasks bar */}
                    <div
                      className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${completedPercent}%` }}
                    />
                    {/* In progress tasks bar */}
                    <div
                      className="absolute top-0 h-full bg-orange-500 transition-all duration-300"
                      style={{
                        left: `${completedPercent}%`,
                        width: `${inProgressPercent}%`
                      }}
                    />
                    
                    {/* Task counts overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700 mix-blend-difference">
                        {member.tasksCompleted} completed, {member.tasksInProgress} in progress
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Legend */}
          {teamMembers.length > 0 && (
            <div className="flex justify-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
