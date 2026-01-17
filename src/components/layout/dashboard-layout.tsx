'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  QueueListIcon,
  CalendarDaysIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth.context';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Categories', href: '/categories', icon: FolderIcon },
  { name: 'Client Master', href: '/clients', icon: BuildingOfficeIcon },
  { name: 'Non Recurring Tasks', href: '/tasks/non-recurring', icon: ClipboardDocumentListIcon },
  { name: 'Recurring Tasks', href: '/tasks/recurring', icon: ArrowPathIcon },
  { name: 'Attendance List', href: '/attendance', icon: CalendarDaysIcon },
  { name: 'Teams', href: '/teams', icon: UserGroupIcon },
  { name: 'Employees', href: '/employees', icon: UserIcon },
  { name: 'Logout', href: '#', icon: ArrowLeftStartOnRectangleIcon },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { currentUser, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <h1 className="text-xl font-bold text-gray-800">JPCO Dashboard</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const isLogout = item.name === 'Logout';
              
              return (
                <div
                  key={item.name}
                  onClick={isLogout ? handleSignOut : undefined}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    isLogout 
                      ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' 
                      : isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {currentUser?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <ArrowLeftStartOnRectangleIcon className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}