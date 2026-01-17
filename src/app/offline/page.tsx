"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResponsive } from '@/hooks/use-responsive';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized-input';

export default function OfflinePage() {
  const router = useRouter();
  const { device, isTouchDevice } = useResponsive();
  const { isOnline, offlineQueueLength } = useServiceWorker();
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Redirect to dashboard when back online
  useEffect(() => {
    if (isOnline) {
      router.push('/dashboard');
    }
  }, [isOnline, router]);

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1);
    
    // Try to reload the page
    if (navigator.onLine) {
      window.location.href = '/dashboard';
    } else {
      // Show feedback that we're still offline
      setTimeout(() => {
        setRetryAttempts(prev => prev - 1);
      }, 2000);
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a] flex items-center justify-center p-4">
      <ResponsiveLayout maxWidth="md" className="text-center">
        <div className="bg-white dark:bg-gray-dark rounded-2xl shadow-card p-8 md:p-12">
          {/* Offline Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg 
                className="w-10 h-10 md:w-12 md:h-12 text-gray-400 dark:text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" 
                />
              </svg>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-dark dark:text-white mb-4">
              You're Offline
            </h1>
            
            <p className="text-dark-4 dark:text-dark-6 text-base md:text-lg leading-relaxed max-w-md mx-auto">
              It looks like you've lost your internet connection. Some features may not be available until you're back online.
            </p>
          </div>

          {/* Connection Status */}
          <div className="mb-8">
            <div className={`
              inline-flex items-center px-4 py-2 rounded-full text-sm font-medium
              ${isOnline 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }
            `}>
              <div className={`
                w-2 h-2 rounded-full mr-2
                ${isOnline ? 'bg-green-500' : 'bg-red-500'}
              `} />
              {isOnline ? 'Back Online' : 'Offline'}
            </div>
          </div>

          {/* Offline Queue Status */}
          {offlineQueueLength > 0 && (
            <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center text-blue-800 dark:text-blue-400">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  {offlineQueueLength} action{offlineQueueLength !== 1 ? 's' : ''} queued for when you're back online
                </span>
              </div>
            </div>
          )}

          {/* Available Offline Features */}
          <div className="mb-8 text-left">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-4 text-center">
              Available Offline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-dark dark:text-white">View cached data</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-dark dark:text-white">Browse previous pages</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-dark dark:text-white">Queue form submissions</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-dark dark:text-white">Access saved content</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <TouchOptimizedButton
              variant="primary"
              size={device.type === 'mobile' ? 'lg' : 'md'}
              touchTargetSize={isTouchDevice ? 'lg' : 'md'}
              onClick={handleRetry}
              disabled={retryAttempts > 0}
              className="min-w-[140px]"
            >
              {retryAttempts > 0 ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Checking...
                </div>
              ) : (
                'Try Again'
              )}
            </TouchOptimizedButton>

            <TouchOptimizedButton
              variant="outline"
              size={device.type === 'mobile' ? 'lg' : 'md'}
              touchTargetSize={isTouchDevice ? 'lg' : 'md'}
              onClick={handleGoHome}
              className="min-w-[140px]"
            >
              Go to Home
            </TouchOptimizedButton>
          </div>

          {/* Tips for Offline Usage */}
          <div className="mt-8 pt-8 border-t border-stroke dark:border-stroke-dark">
            <h4 className="text-sm font-semibold text-dark dark:text-white mb-3">
              Tips for Offline Usage
            </h4>
            <div className="text-xs text-dark-4 dark:text-dark-6 space-y-2">
              <p>• Your form submissions will be saved and sent when you're back online</p>
              <p>• Previously viewed pages and data are still accessible</p>
              <p>• Changes made offline will sync automatically when connection is restored</p>
            </div>
          </div>

          {/* Network Information (if available) */}
          {typeof navigator !== 'undefined' && 'connection' in navigator && (
            <div className="mt-6 text-xs text-dark-4 dark:text-dark-6">
              Connection: {(navigator as any).connection?.effectiveType || 'Unknown'}
            </div>
          )}
        </div>
      </ResponsiveLayout>
    </div>
  );
}