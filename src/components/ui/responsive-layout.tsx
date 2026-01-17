"use client";

import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";
import React from "react";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  maxWidth = '2xl',
  padding = 'md',
  className
}) => {
  const { device, breakpoint } = useResponsive();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-4',
    md: 'p-4 md:p-6 2xl:p-10',
    lg: 'p-6 md:p-8 2xl:p-12'
  };

  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        // Mobile-first responsive spacing
        device.type === 'mobile' && 'px-4',
        device.type === 'tablet' && 'px-6',
        device.type === 'desktop' && 'px-8',
        className
      )}
      data-device-type={device.type}
      data-breakpoint={breakpoint}
    >
      {children}
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className
}) => {
  const { device } = useResponsive();

  const gapClasses = {
    sm: 'gap-2 md:gap-4',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8'
  };

  const getGridCols = () => {
    switch (device.type) {
      case 'mobile':
        return `grid-cols-${columns.mobile || 1}`;
      case 'tablet':
        return `grid-cols-${columns.tablet || 2}`;
      case 'desktop':
        return `grid-cols-${columns.desktop || 3}`;
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div
      className={cn(
        'grid',
        getGridCols(),
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
};

interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: {
    mobile?: 'vertical' | 'horizontal';
    tablet?: 'vertical' | 'horizontal';
    desktop?: 'vertical' | 'horizontal';
  };
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = { mobile: 'vertical', tablet: 'horizontal', desktop: 'horizontal' },
  spacing = 'md',
  className
}) => {
  const { device } = useResponsive();

  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const getFlexDirection = () => {
    const currentDirection = direction[device.type] || 'vertical';
    return currentDirection === 'vertical' ? 'flex-col' : 'flex-row';
  };

  return (
    <div
      className={cn(
        'flex',
        getFlexDirection(),
        spacingClasses[spacing],
        className
      )}
    >
      {children}
    </div>
  );
};