'use client';

/**
 * ULTRA-OPTIMIZED Dashboard Page for Mobile
 * 
 * Key Optimizations:
 * 1. Minimal initial Firestore reads (stats only - 1-2 reads vs 100+)
 * 2. Lazy loading of tasks with pagination
 * 3. Virtual scrolling for large task lists
 * 4. Mobile-first responsive design
 * 5. Progressive hydration for charts
 * 6. Aggressive caching (2-minute TTL)
 */

import React, { Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { MobileDashboard } from '@/components/dashboard/MobileDashboard';
import { SimpleStatCard } from '@/components/dashboard/SimpleStatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SkeletonLoader } from '@/components/ProgressiveHydration';
import { 
  ClipboardDocumentListIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

// Lazy load charts - only for desktop
const TaskDistributionChart = lazy(() => 
  import('@/components/Charts/TaskDistributionChart').then(m => ({ default: m.TaskDistributionChart }))
);

const WeeklyProgressChart = lazy(() => 
  import('@/components/Charts/WeeklyProgressChart').then(m => ({ default: m.WeeklyProgressChart }))
);

export default function DashboardPageOptimized() {
  const { user, loading: authLoading, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const { stats, tasks, loading, error, loadMore, hasMore, refresh } = useDashboardData();

  // Detect mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="p-4">
        <SkeletonLoader className="h-32 w-full mb-4" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-800 rounded">
          Error loading dashboard: {error.message}
          <button
            onClick={refresh}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
          No data available
        </div>
      </div>
    );
  }

  // Mobile view - ultra optimized
  if (isMobile) {
    return (
      <MobileDashboard
        stats={stats}
        tasks={tasks}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    );
  }

  // Desktop view - full featured
  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-5">
        <SimpleStatCard
          title="Total Tasks"
          value={stats.total}
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
          onClick={() => router.push('/tasks/non-recurring')}
        />
        <SimpleStatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="green"
        />
        <SimpleStatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<ClockIcon className="w-6 h-6" />}
          color="orange"
        />
        <SimpleStatCard
          title="To Do"
          value={stats.todo}
          icon={<PlusCircleIcon className="w-6 h-6" />}
          color="blue"
        />
        <SimpleStatCard
          title="Overdue"
          value={stats.overdue}
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          color="red"
          subtitle="Past due"
        />
      </div>

      {/* Charts - Desktop only */}
      {(isAdmin || isManager) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<SkeletonLoader className="h-64 w-full" />}>
            <TaskDistributionChart
              completed={stats.completed}
              inProgress={stats.inProgress}
              todo={stats.todo}
              total={stats.total}
            />
          </Suspense>
          <QuickActions
            onCreateTask={() => router.push('/tasks/non-recurring')}
            onViewTeam={() => router.push('/users')}
            onManageProjects={() => router.push('/categories')}
            onViewRoster={() => router.push('/roster')}
            onViewReports={() => router.push('/reports')}
            onViewAttendance={() => router.push('/attendance')}
            isAdminOrManager={isAdmin || isManager}
            isManager={isManager}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Tasks
          </h3>
          <button
            onClick={() => router.push('/tasks/non-recurring')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {tasks.slice(0, 5).map(task => (
            <div
              key={task.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
              onClick={() => router.push(`/tasks/${task.isRecurring ? 'recurring' : 'non-recurring'}`)}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  task.status === 'completed' ? 'bg-green-100 text-green-700' :
                  task.status === 'in-progress' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {task.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Assigned to: {task.assignedToNames.join(', ') || 'Unassigned'}
              </p>
            </div>
          ))}
        </div>
        {hasMore && (
          <button
            onClick={loadMore}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Tasks
          </button>
        )}
      </div>
    </div>
  );
}
