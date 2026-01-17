import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WeeklyProgressChartProps {
  data: {
    labels: string[];
    created: number[];
    completed: number[];
  };
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  const maxValue = Math.max(...data.created, ...data.completed, 10);
  const chartHeight = 200;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <div className="relative" style={{ height: chartHeight }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
              <span>{maxValue}</span>
              <span>{Math.round(maxValue * 0.75)}</span>
              <span>{Math.round(maxValue * 0.5)}</span>
              <span>{Math.round(maxValue * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-8 h-full border-l border-b border-gray-200 relative">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={percent}
                  className="absolute w-full border-t border-gray-100"
                  style={{ bottom: `${percent}%` }}
                />
              ))}

              {/* Bars */}
              <div className="absolute inset-0 flex items-end justify-around px-2">
                {data.labels.map((label, index) => {
                  const createdHeight = (data.created[index] / maxValue) * 100;
                  const completedHeight = (data.completed[index] / maxValue) * 100;

                  return (
                    <div key={index} className="flex flex-col items-center flex-1 mx-1">
                      <div className="w-full flex gap-1 items-end justify-center">
                        {/* Created bar */}
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${createdHeight}%`, minHeight: data.created[index] > 0 ? '4px' : '0' }}
                          title={`Created: ${data.created[index]}`}
                        />
                        {/* Completed bar */}
                        <div
                          className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                          style={{ height: `${completedHeight}%`, minHeight: data.completed[index] > 0 ? '4px' : '0' }}
                          title={`Completed: ${data.completed[index]}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="ml-8 mt-2 flex justify-around text-xs text-gray-500">
              {data.labels.map((label, index) => (
                <span key={index} className="flex-1 text-center">
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-600">Created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
