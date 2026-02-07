"use client";

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Bell className="w-12 h-12 text-gray-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Notification functionality will be implemented here in the future.
        </p>
      </div>
    </div>
  );
}
