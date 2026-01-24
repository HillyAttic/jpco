'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  PlusCircleIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { recurringTaskService, RecurringTask } from '@/services/recurring-task.service';
import { StatCard } from '@/components/dashboard/StatCard';
import { TaskOverview } from '@/components/dashboard/TaskOverview';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TaskDistributionChart } from '@/components/Charts/TaskDistributionChart';
import { WeeklyProgressChart } from '@/components/Charts/WeeklyProgressChart';
import { TeamPerformanceChart } from '@/components/Charts/TeamPerformanceChart';

// Extended task type to include recurring tasks
interface DashboardTask extends Task {
  isRecurring?: boolean;
  recurrencePattern?: string;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch non-recurring tasks
      const nonRecurringTasks = await taskApi.getTasks();
      
      // Fetch recurring tasks
      const recurringTasks = await recurringTaskService.getAll();
      
      // Convert recurring tasks to dashboard tasks format
      const recurringDashboardTasks: DashboardTask[] = recurringTasks.map(task => ({
        id: task.id!,
        title: task.title,
        description: task.description,
        dueDate: task.nextOccurrence,
        priority: task.priority as TaskPriority,
        status: task.status as TaskStatus,
        assignedTo: task.contactIds || [],
        category: task.categoryId,
        createdAt: task.createdAt || new Date(),
        updatedAt: task.updatedAt || new Date(),
        isRecurring: true,
        recurrencePattern: task.recurrencePattern,
      }));
      
      // Combine both types of tasks
      const allTasks = [
        ...nonRecurringTasks.map(task => ({ ...task, isRecurring: false })),
        ...recurringDashboardTasks
      ];
      
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    return { total, todo, inProgress, completed, overdue };
  }, [tasks]);

  // Weekly progress data
  const weeklyData = useMemo(() => {
    const today = new Date();
    const labels = [];
    const created = [];
    const completed = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      // Mock data - replace with actual data from your API
      created.push(Math.floor(Math.random() * 10) + 3);
      completed.push(Math.floor(Math.random() * 8) + 2);
    }
    
    return { labels, created, completed };
  }, []);

  // Team performance data
  const teamData = useMemo(() => {
    // Mock data - replace with actual team data from your API
    return [
      { name: 'John Doe', tasksCompleted: 12, tasksInProgress: 3 },
      { name: 'Jane Smith', tasksCompleted: 15, tasksInProgress: 5 },
      { name: 'Mike Johnson', tasksCompleted: 8, tasksInProgress: 2 },
      { name: 'Sarah Williams', tasksCompleted: 10, tasksInProgress: 4 }
    ];
  }, []);

  // Recent activities
  const activities = useMemo(() => {
    // Mock data - replace with actual activity data from your API
    return tasks.slice(0, 5).map((task, index) => {
      const type = task.status === 'completed' ? 'completed' : index % 2 === 0 ? 'created' : 'updated';
      return {
        id: task.id,
        type: type as 'completed' | 'created' | 'updated' | 'deleted' | 'assigned',
        taskTitle: task.title,
        user: 'Current User',
        timestamp: task.updatedAt
      };
    });
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <Button className="text-white w-full sm:w-auto">
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          subtitle="All tasks"
          icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="Tasks done"
          icon={<CheckCircleIcon className="w-5 h-5" />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          subtitle="Active tasks"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
        <StatCard
          title="To Do"
          value={stats.todo}
          subtitle="Pending tasks"
          icon={<ClockIcon className="w-5 h-5" />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          subtitle="Past due"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Task Overview & Upcoming Deadlines */}
        <div className="space-y-4 md:space-y-6">
          <TaskOverview tasks={tasks} />
          <UpcomingDeadlines tasks={tasks} />
        </div>

        {/* Middle Column - Charts */}
        <div className="space-y-4 md:space-y-6">
          <TaskDistributionChart
            completed={stats.completed}
            inProgress={stats.inProgress}
            todo={stats.todo}
            total={stats.total}
          />
          <QuickActions />
        </div>

        {/* Right Column - Activity & Team Performance */}
        <div className="space-y-4 md:space-y-6">
          <ActivityFeed activities={activities} />
        </div>
      </div>

      {/* Bottom Section - Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <WeeklyProgressChart data={weeklyData} />
        <TeamPerformanceChart teamMembers={teamData} />
      </div>
    </div>
  );
}