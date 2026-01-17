import { useEffect, useRef, useState, useCallback } from 'react';
import { useResponsive } from './use-responsive';

interface LazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  fallbackDelay?: number;
}

export function useLazyLoading(options: LazyLoadingOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    fallbackDelay = 100
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { device } = useResponsive();

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Use Intersection Observer if available, otherwise fallback to timeout
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          const isVisible = entry.isIntersecting;
          
          setIsIntersecting(isVisible);
          
          if (isVisible && !hasIntersected) {
            setHasIntersected(true);
            
            if (triggerOnce) {
              cleanup();
            }
          }
        },
        {
          threshold,
          rootMargin: device.type === 'mobile' ? '100px' : rootMargin
        }
      );

      observerRef.current.observe(element);
    } else {
      // Fallback for browsers without Intersection Observer
      const fallbackTimer = setTimeout(() => {
        setIsIntersecting(true);
        setHasIntersected(true);
      }, fallbackDelay);

      return () => clearTimeout(fallbackTimer);
    }

    return cleanup;
  }, [threshold, rootMargin, triggerOnce, fallbackDelay, hasIntersected, device.type, cleanup]);

  const shouldLoad = triggerOnce ? hasIntersected : isIntersecting;

  return {
    elementRef,
    isIntersecting,
    hasIntersected,
    shouldLoad
  };
}

// Hook for lazy loading images with responsive behavior
export function useLazyImage(src: string, options: LazyLoadingOptions = {}) {
  const { elementRef, shouldLoad } = useLazyLoading(options);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (shouldLoad && !imageSrc) {
      setImageSrc(src);
    }
  }, [shouldLoad, src, imageSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
  }, []);

  return {
    elementRef,
    imageSrc,
    isLoaded,
    hasError,
    shouldLoad,
    handleLoad,
    handleError
  };
}

// Hook for lazy loading components with performance optimization
export function useLazyComponent<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: LazyLoadingOptions = {}
) {
  const { elementRef, shouldLoad } = useLazyLoading(options);
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (shouldLoad && !Component && !isLoading) {
      setIsLoading(true);
      
      importFn()
        .then((module) => {
          setComponent(() => module.default);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to lazy load component:', error);
          setHasError(true);
          setIsLoading(false);
        });
    }
  }, [shouldLoad, Component, isLoading, importFn]);

  return {
    elementRef,
    Component,
    isLoading,
    hasError,
    shouldLoad
  };
}

// Performance monitoring for lazy loading
export function useLazyLoadingPerformance() {
  const [metrics, setMetrics] = useState({
    totalComponents: 0,
    loadedComponents: 0,
    failedComponents: 0,
    averageLoadTime: 0
  });

  const trackComponentLoad = useCallback((loadTime: number, success: boolean) => {
    setMetrics(prev => ({
      totalComponents: prev.totalComponents + 1,
      loadedComponents: success ? prev.loadedComponents + 1 : prev.loadedComponents,
      failedComponents: success ? prev.failedComponents : prev.failedComponents + 1,
      averageLoadTime: success 
        ? (prev.averageLoadTime * prev.loadedComponents + loadTime) / (prev.loadedComponents + 1)
        : prev.averageLoadTime
    }));
  }, []);

  const getLoadingEfficiency = useCallback(() => {
    if (metrics.totalComponents === 0) return 0;
    return (metrics.loadedComponents / metrics.totalComponents) * 100;
  }, [metrics]);

  return {
    metrics,
    trackComponentLoad,
    getLoadingEfficiency
  };
}