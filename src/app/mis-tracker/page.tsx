'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';

export default function MISTrackerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthEnhanced();

  const [loading, setLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchConfig();
    }
  }, [authLoading, user]);

  const fetchConfig = async () => {
    try {
      setLoading(true);

      const response = await authenticatedFetch('/api/mis-config');
      const data = await response.json();

      if (response.ok && data.success) {
        setSheetUrl(data.data.sheetUrl || '');
        setHasAccess(data.data.hasSheetAccess || false);
      } else {
        toast.error('Failed to load MIS configuration');
      }
    } catch (error) {
      console.error('Error fetching MIS config:', error);
      toast.error('Failed to load MIS configuration');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess || !sheetUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You do not have permission to view the MIS Tracker. Please contact your administrator
            if you believe this is an error.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MIS Tracker</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Management Information System Report
        </p>
      </div>

      <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <iframe
            src={sheetUrl}
            className="w-full h-full"
            style={{ border: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="MIS Tracker Report"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
