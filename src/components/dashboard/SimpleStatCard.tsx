/**
 * Simplified StatCard for Dashboard
 * Lightweight wrapper with sensible defaults
 */

import React from 'react';
import { StatCard } from './StatCard';

interface SimpleStatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  subtitle?: string;
}

const colorMap = {
  blue: {
    iconBgColor: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    iconBgColor: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  orange: {
    iconBgColor: 'bg-orange-100 dark:bg-orange-900',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    iconBgColor: 'bg-red-100 dark:bg-red-900',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  purple: {
    iconBgColor: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
};

export function SimpleStatCard({
  title,
  value,
  icon,
  onClick,
  color = 'blue',
  subtitle,
}: SimpleStatCardProps) {
  const colors = colorMap[color];
  
  return (
    <StatCard
      title={title}
      value={value}
      subtitle={subtitle || (onClick ? 'Click to view details' : '')}
      icon={icon}
      iconBgColor={colors.iconBgColor}
      iconColor={colors.iconColor}
      onClick={onClick}
    />
  );
}
