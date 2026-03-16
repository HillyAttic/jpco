import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: React.ReactNode;
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
      <CardHeader className={`flex flex-row items-center justify-between ${compact ? 'pb-1 space-y-0 px-3 pt-3 md:px-5 md:pt-5 md:pb-3' : 'pb-2'}`}>
        <CardTitle className={`${compact ? 'text-xs leading-tight flex-1 min-w-0 md:text-sm md:font-normal' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 pr-2`}>{title}</CardTitle>
        <div className={`${compact ? 'p-1 flex-shrink-0 md:p-2.5' : 'p-2'} ${iconBgColor} rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'pt-0 md:px-5 md:pb-5' : ''}>
        <div className={`${compact ? 'text-xl md:text-4xl' : 'text-2xl'} font-bold md:font-normal text-gray-900 md:text-gray-700 dark:text-white`}>{value}</div>
        {compact && subtitle && (
          <p className="hidden md:block text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
        )}
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
