"use client";

import React, { Suspense } from 'react';
import { useLazyLoading, useLazyComponent } from '@/hooks/use-lazy-loading';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';

interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  className?: string;
  minHeight?: string;
  showSkeleton?: boolean;
}

export function LazyLoad({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  className,
  minHeight,
  showSkeleton = true
}: LazyLoadProps) {
  const { elementRef, shouldLoad } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce
  });
  const { device } = useResponsive();

  const defaultFallback = showSkeleton ? (
    <div 
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg',
        device.type === 'mobile' ? 'h-32' : 'h-48'
      )}
      style={{ minHeight }}
    />
  ) : null;

  return (
    <div 
      ref={elementRef} 
      className={cn('w-full', className)}
      style={{ minHeight }}
    >
      {shouldLoad ? children : (fallback || defaultFallback)}
    </div>
  );
}

// Lazy load component with dynamic import
interface LazyComponentProps<T = any> {
  importFn: () => Promise<{ default: React.ComponentType<T> }>;
  componentProps?: T;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  minHeight?: string;
}

export function LazyComponent<T = any>({
  importFn,
  componentProps,
  fallback,
  errorFallback,
  threshold = 0.1,
  rootMargin = '50px',
  className,
  minHeight
}: LazyComponentProps<T>) {
  const { 
    elementRef, 
    Component, 
    isLoading, 
    hasError 
  } = useLazyComponent(importFn, { threshold, rootMargin });
  const { device } = useResponsive();

  const defaultFallback = (
    <div 
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center',
        device.type === 'mobile' ? 'h-32' : 'h-48'
      )}
      style={{ minHeight }}
    >
      <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const defaultErrorFallback = (
    <div 
      className={cn(
        'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center',
        device.type === 'mobile' ? 'h-32' : 'h-48'
      )}
      style={{ minHeight }}
    >
      <p className="text-red-600 dark:text-red-400 text-sm">
        Failed to load component
      </p>
    </div>
  );

  if (hasError) {
    return (
      <div ref={elementRef} className={className}>
        {errorFallback || defaultErrorFallback}
      </div>
    );
  }

  if (isLoading || !Component) {
    return (
      <div ref={elementRef} className={className}>
        {fallback || defaultFallback}
      </div>
    );
  }

  return (
    <div ref={elementRef} className={className}>
      <Suspense fallback={fallback || defaultFallback}>
        <Component {...(componentProps as T)} />
      </Suspense>
    </div>
  );
}

// Lazy load for responsive images
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  threshold?: number;
  rootMargin?: string;
  placeholder?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  objectFit = 'cover',
  threshold = 0.1,
  rootMargin = '50px',
  placeholder
}: LazyImageProps) {
  const { elementRef, shouldLoad } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: true
  });
  const { device } = useResponsive();

  const placeholderElement = placeholder ? (
    <img 
      src={placeholder} 
      alt="" 
      className={cn('blur-sm', className)}
      style={{ width, height }}
    />
  ) : (
    <div 
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 flex items-center justify-center',
        className
      )}
      style={{ width, height }}
    >
      <svg 
        className="w-8 h-8 text-gray-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
        />
      </svg>
    </div>
  );

  return (
    <div ref={elementRef}>
      {shouldLoad ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            `object-${objectFit}`,
            className
          )}
          style={{ width, height }}
          loading="lazy"
        />
      ) : (
        placeholderElement
      )}
    </div>
  );
}

// Lazy load for responsive content sections
interface LazyContentSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  animateOnLoad?: boolean;
}

export function LazyContentSection({
  children,
  title,
  description,
  className,
  threshold = 0.1,
  rootMargin = '100px',
  animateOnLoad = true
}: LazyContentSectionProps) {
  const { elementRef, shouldLoad, isIntersecting } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: false
  });

  return (
    <section 
      ref={elementRef}
      className={cn(
        'transition-all duration-700',
        animateOnLoad && shouldLoad && isIntersecting 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8',
        className
      )}
    >
      {title && (
        <h2 className="text-2xl font-bold text-dark dark:text-white mb-4">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-dark-4 dark:text-dark-6 mb-6">
          {description}
        </p>
      )}
      {shouldLoad ? children : (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      )}
    </section>
  );
}