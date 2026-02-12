'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { Sidebar } from '@/components/Layouts/sidebar';
import { Header } from '@/components/Layouts/header';
import { MobileBottomNav } from '@/components/Layouts/mobile-bottom-nav';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const publicRoutes = [
  '/auth/sign-in',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const authRoutes = [
  '/auth/sign-in',
  '/auth/forgot-password',
];

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading } = useEnhancedAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    if (!user && !isPublicRoute) {
      // User is not authenticated and trying to access protected route
      router.push('/auth/sign-in');
      return;
    }

    if (user && isAuthRoute) {
      // User is authenticated and trying to access auth routes
      router.push('/dashboard');
      return;
    }

    if (user && pathname === '/') {
      // Authenticated user on root path
      router.push('/dashboard');
      return;
    }
  }, [user, loading, pathname, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Show loading for redirects
  if (!user && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  if (user && (isAuthRoute || pathname === '/')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // For auth pages, render without sidebar and header
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-gray-2 dark:bg-[#020d1a]">
        <main className="flex-1 isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    );
  }

  // For protected pages, render with sidebar and header
  return (
    <div className="flex min-h-screen bg-gray-2 dark:bg-[#020d1a]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main 
          id="main-content"
          className="flex-1 isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10 pb-20 md:pb-10"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};