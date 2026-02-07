'use client';

import React, { ReactNode } from 'react';
import { Sidebar } from '@/components/Layouts/sidebar';
import { Header } from '@/components/Layouts/header';
import { MobileBottomNav } from '@/components/Layouts/mobile-bottom-nav';
import { SidebarProvider } from '@/components/Layouts/sidebar/sidebar-context';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { useResponsive } from '@/hooks/use-responsive';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Modern responsive dashboard layout that replaces the legacy fixed sidebar implementation.
 * Uses the adaptive sidebar system with mobile hamburger menu, tablet condensed mode,
 * and desktop expanded mode. Includes touch optimization and accessibility features.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { device, isTouchDevice } = useResponsive();

  return (
    <SidebarProvider defaultOpen={device.type === 'desktop'}>
      {/* Skip to main content link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] bg-primary text-white px-4 py-2 rounded-md text-sm font-medium"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        {/* Responsive Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Responsive Header */}
          <Header />

          {/* Main Content with Responsive Layout */}
          <main 
            id="main-content"
            className="flex-1 isolate"
            role="main"
            aria-label="Main content"
          >
            <ResponsiveLayout
              maxWidth="2xl"
              padding="md"
              className={`
                min-h-full
                ${isTouchDevice ? 'touch-manipulation' : ''}
                ${device.type === 'mobile' ? 'pb-16' : ''}
              `}
            >
              {children}
            </ResponsiveLayout>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}