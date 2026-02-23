"use client";

import { useState } from 'react';

export function NotificationSetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Setup Instructions
          </h3>
        </div>
        <svg 
          className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 text-sm text-blue-700 dark:text-blue-300">
          <div>
            <h4 className="font-medium mb-2">For Administrators:</h4>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                Go to Firebase Console → Project Settings → Cloud Messaging
              </li>
              <li>
                Copy the "Web Push certificate" (VAPID key)
              </li>
              <li>
                Add to .env.local: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code>
              </li>
              <li>
                Copy the "Server key" from Cloud Messaging API (legacy)
              </li>
              <li>
                Add to .env.local: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">FIREBASE_SERVER_KEY</code>
              </li>
              <li>
                Restart the development server
              </li>
            </ol>
          </div>

          <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
            <h4 className="font-medium mb-2">Automatic Notifications:</h4>
            <ul className="space-y-1 ml-2">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Task assignments (recurring & non-recurring)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Leave request approvals</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400">•</span>
                <span>Leave request rejections</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
