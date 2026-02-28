import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
  trend,
  onClick,
  compact = false
}: StatCardProps) {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow duration-200 ${onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600' : ''}`}
      onClick={onClick}
    >
      <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-1' : 'pb-2'}`}>
        <CardTitle className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400`}>{title}</CardTitle>
        <div className={`${compact ? 'p-1.5' : 'p-2'} ${iconBgColor} rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>{value}</div>
        {!compact && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            {trend && (
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
