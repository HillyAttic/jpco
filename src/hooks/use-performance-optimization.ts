import { useEffect, useState, useCallback, useRef } from 'react';
import { useResponsive } from './use-responsive';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  isLowPerformance: boolean;
  shouldReduceAnimations: boolean;
  connectionType: string;
  isSlowConnection: boolean;
}

export function usePerformanceOptimization() {
  const { device, isTouchDevice } = useResponsive();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    isLowPerformance: false,
    shouldReduceAnimations: false,
    connectionType: 'unknown',
    isSlowConnection: false
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationFrameId = useRef<number>();

  // FPS monitoring
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCount.current++;

    if (now - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      
      setMetrics(prev => ({
        ...prev,
        fps,
        isLowPerformance: fps < 30,
        shouldReduceAnimations: fps < 45 || device.type === 'mobile'
      }));

      frameCount.current = 0;
      lastTime.current = now;
    }

    animationFrameId.current = requestAnimationFrame(measureFPS);
  }, [device.type]);

  // Memory usage monitoring
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round(memoryUsage * 100)
      }));
    }
  }, []);

  // Network connection monitoring
  const measureConnection = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const connectionType = connection.effectiveType || 'unknown';
      const isSlowConnection = ['slow-2g', '2g', '3g'].includes(connectionType);
      
      setMetrics(prev => ({
        ...prev,
        connectionType,
        isSlowConnection
      }));
    }
  }, []);

  useEffect(() => {
    // Start FPS monitoring
    animationFrameId.current = requestAnimationFrame(measureFPS);

    // Monitor memory usage every 5 seconds
    const memoryInterval = setInterval(measureMemoryUsage, 5000);

    // Monitor connection
    measureConnection();
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', measureConnection);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      clearInterval(memoryInterval);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.removeEventListener('change', measureConnection);
      }
    };
  }, [measureFPS, measureMemoryUsage, measureConnection]);

  // Performance-based animation settings
  const getAnimationSettings = useCallback(() => {
    const baseSettings = {
      duration: 300,
      easing: 'ease-out',
      reducedMotion: false
    };

    // Check for user's reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      return {
        ...baseSettings,
        duration: 0,
        reducedMotion: true
      };
    }

    // Adjust based on performance metrics
    if (metrics.shouldReduceAnimations || metrics.isSlowConnection) {
      return {
        ...baseSettings,
        duration: device.type === 'mobile' ? 200 : 250,
        easing: 'ease'
      };
    }

    // High performance settings
    if (metrics.fps >= 60 && !isTouchDevice) {
      return {
        ...baseSettings,
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      };
    }

    return baseSettings;
  }, [metrics, device.type, isTouchDevice]);

  // Debounced resize handler for performance
  const useDebouncedResize = useCallback((callback: () => void, delay: number = 150) => {
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      const handleResize = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(callback, delay);
      };

      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [callback, delay]);
  }, []);

  // Throttled scroll handler for performance
  const useThrottledScroll = useCallback((callback: () => void, delay: number = 16) => {
    const lastRun = useRef(Date.now());

    useEffect(() => {
      const handleScroll = () => {
        if (Date.now() - lastRun.current >= delay) {
          callback();
          lastRun.current = Date.now();
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }, [callback, delay]);
  }, []);

  // Optimized animation frame callback
  const useOptimizedAnimationFrame = useCallback((callback: () => void) => {
    const animationRef = useRef<number>();
    const isRunning = useRef(false);

    const animate = useCallback(() => {
      if (!isRunning.current) return;
      
      callback();
      animationRef.current = requestAnimationFrame(animate);
    }, [callback]);

    const start = useCallback(() => {
      if (!isRunning.current) {
        isRunning.current = true;
        animationRef.current = requestAnimationFrame(animate);
      }
    }, [animate]);

    const stop = useCallback(() => {
      isRunning.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }, []);

    useEffect(() => {
      return () => {
        stop();
      };
    }, [stop]);

    return { start, stop };
  }, []);

  return {
    metrics,
    getAnimationSettings,
    useDebouncedResize,
    useThrottledScroll,
    useOptimizedAnimationFrame,
    // Utility functions
    shouldUseReducedAnimations: metrics.shouldReduceAnimations || metrics.isSlowConnection,
    shouldPreloadImages: !metrics.isSlowConnection && metrics.fps >= 45,
    shouldUseLazyLoading: metrics.isSlowConnection || device.type === 'mobile',
    recommendedImageQuality: metrics.isSlowConnection ? 60 : 85
  };
}

// Hook for monitoring component render performance
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = performance.now();
    renderCount.current++;
  });

  useEffect(() => {
    if (startTime.current) {
      const renderTime = performance.now() - startTime.current;
      renderTimes.current.push(renderTime);
      
      // Keep only last 10 render times
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }
  });

  const getAverageRenderTime = useCallback(() => {
    if (renderTimes.current.length === 0) return 0;
    const sum = renderTimes.current.reduce((a, b) => a + b, 0);
    return sum / renderTimes.current.length;
  }, []);

  return {
    renderCount: renderCount.current,
    averageRenderTime: getAverageRenderTime(),
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0
  };
}

// Hook for code splitting and dynamic imports
export function useCodeSplitting() {
  const [loadedModules, setLoadedModules] = useState<Set<string>>(new Set());
  const { device } = useResponsive();

  const loadModule = useCallback(async (
    moduleName: string,
    importFn: () => Promise<any>
  ) => {
    if (loadedModules.has(moduleName)) {
      return;
    }

    try {
      await importFn();
      setLoadedModules(prev => new Set([...prev, moduleName]));
    } catch (error) {
      console.error(`Failed to load module ${moduleName}:`, error);
    }
  }, [loadedModules]);

  const preloadMobileModules = useCallback(async () => {
    if (device.type === 'mobile') {
      // Preload mobile-specific modules
      const mobileModules = [
        'touch-gestures',
        'mobile-navigation',
        'mobile-forms'
      ];

      for (const module of mobileModules) {
        // This would be implemented based on your specific modules
        console.log(`Preloading mobile module: ${module}`);
      }
    }
  }, [device.type]);

  useEffect(() => {
    preloadMobileModules();
  }, [preloadMobileModules]);

  return {
    loadedModules,
    loadModule,
    isModuleLoaded: (moduleName: string) => loadedModules.has(moduleName)
  };
}