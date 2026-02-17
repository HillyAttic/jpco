'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { recurringTaskService, RecurringTask } from '@/services/recurring-task.service';
import { leaveService } from '@/services/leave.service';
import { LeaveRequest } from '@/types/attendance.types';
import { calculateAllOccurrences } from '@/utils/recurrence-scheduler';
import { CalendarView } from '@/components/calendar-view';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { TaskCreationModal } from '@/components/task-creation-modal';
import { auth } from '@/lib/firebase';

// Extended task type to include recurring task occurrences and leave requests
interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
  isLeave?: boolean;
  leaveId?: string;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [nonRecurringTasks, setNonRecurringTasks] = useState<Task[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  /**
   * Generate calendar task occurrences from recurring tasks
   * Creates individual task entries for each occurrence based on recurrence pattern
   * Optimized to only generate occurrences for the visible calendar range
   */
  const generateRecurringTaskOccurrences = React.useCallback((recurringTasks: RecurringTask[]): CalendarTask[] => {
    const calendarTasks: CalendarTask[] = [];

    // Optimize: Only generate occurrences for current year ± 1 year (3 years total instead of 7)
    const calendarStartDate = new Date();
    calendarStartDate.setFullYear(calendarStartDate.getFullYear() - 1);
    calendarStartDate.setMonth(0); // January
    calendarStartDate.setDate(1);

    const calendarEndDate = new Date();
    calendarEndDate.setFullYear(calendarEndDate.getFullYear() + 1);
    calendarEndDate.setMonth(11); // December
    calendarEndDate.setDate(31);

    recurringTasks.forEach(recurringTask => {
      // Skip paused tasks
      if (recurringTask.isPaused) return;

      // For recurring tasks, use dueDate as the starting point for occurrences
      // This ensures the calendar shows when tasks are actually due, not when they started
      const taskDueDate = new Date(recurringTask.dueDate);
      const taskEndDate = recurringTask.endDate ? new Date(recurringTask.endDate) : calendarEndDate;

      // Only generate occurrences within the calendar range
      const occurrenceStartDate = taskDueDate > calendarStartDate ? taskDueDate : calendarStartDate;
      const occurrenceEndDate = taskEndDate < calendarEndDate ? taskEndDate : calendarEndDate;

      // Skip if task is completely outside the calendar range
      if (occurrenceStartDate > calendarEndDate || occurrenceEndDate < calendarStartDate) {
        return;
      }

      try {
        const occurrences = calculateAllOccurrences(
          occurrenceStartDate,
          occurrenceEndDate,
          recurringTask.recurrencePattern
        );

        // Create a calendar task for each occurrence
        occurrences.forEach(occurrenceDate => {
          // Check if this occurrence was completed
          const wasCompleted = recurringTask.completionHistory.some(completion => {
            const completionDate = new Date(completion.date);
            return (
              completionDate.getDate() === occurrenceDate.getDate() &&
              completionDate.getMonth() === occurrenceDate.getMonth() &&
              completionDate.getFullYear() === occurrenceDate.getFullYear()
            );
          });

          calendarTasks.push({
            id: `${recurringTask.id}-${occurrenceDate.getTime()}`,
            title: recurringTask.title,
            description: recurringTask.description,
            dueDate: occurrenceDate,
            priority: recurringTask.priority as TaskPriority,
            status: wasCompleted ? TaskStatus.COMPLETED : recurringTask.status as TaskStatus,
            assignedTo: recurringTask.contactIds || [],
            category: recurringTask.categoryId,
            createdAt: recurringTask.createdAt || new Date(),
            updatedAt: recurringTask.updatedAt || new Date(),
            isRecurring: true,
            recurringTaskId: recurringTask.id,
            recurrencePattern: recurringTask.recurrencePattern,
          });
        });
      } catch (error) {
        console.error(`Error generating occurrences for task ${recurringTask.id}:`, error);
      }
    });

    return calendarTasks;
  }, []);

  /**
   * Generate calendar tasks for leave requests
   */
  const generateLeaveOccurrences = React.useCallback((leaves: LeaveRequest[]): CalendarTask[] => {
    const leaveTasks: CalendarTask[] = [];

    leaves.forEach(leave => {
      if (!leave.startDate || !leave.endDate) return;

      // Convert timestamps to Date objects if needed
      const startDate = leave.startDate instanceof Date
        ? leave.startDate
        : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

      const endDate = leave.endDate instanceof Date
        ? leave.endDate
        : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

      const current = new Date(startDate);

      // Loop through each day of the leave
      while (current <= endDate) {
        leaveTasks.push({
          id: `leave-${leave.id}-${current.getTime()}`,
          title: `OFF: ${leave.leaveTypeName}`, // Display as 'OFF: Sick Leave' etc.
          description: leave.reason,
          dueDate: new Date(current), // Create a new Date instance
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.COMPLETED, // Mark as completed to signify it's a done deal or blocked time
          assignedTo: [leave.employeeId],
          category: 'Leave',
          createdAt: leave.createdAt instanceof Date ? leave.createdAt : new Date(),
          updatedAt: leave.updatedAt instanceof Date ? leave.updatedAt : new Date(),
          isLeave: true,
          leaveId: leave.id
        });

        // Increment day
        current.setDate(current.getDate() + 1);
      }
    });

    return leaveTasks;
  }, []);

  // Memoize the generation of recurring task occurrences to avoid recalculation
  const recurringCalendarTasks = React.useMemo(() => {
    return generateRecurringTaskOccurrences(recurringTasks);
  }, [recurringTasks, generateRecurringTaskOccurrences]);

  // Memoize leave tasks
  const leaveCalendarTasks = React.useMemo(() => {
    return generateLeaveOccurrences(leaveRequests);
  }, [leaveRequests, generateLeaveOccurrences]);

  // Memoize the combined tasks array
  const allTasks = React.useMemo(() => {
    return [
      ...nonRecurringTasks.map(task => ({ ...task, isRecurring: false })),
      ...recurringCalendarTasks,
      ...leaveCalendarTasks
    ];
  }, [nonRecurringTasks, recurringCalendarTasks, leaveCalendarTasks]);

  // Update tasks when allTasks changes
  useEffect(() => {
    setTasks(allTasks);
  }, [allTasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        // If auth is not ready or user not logged in, we might want to wait or just return
        // But since this is a protected page usually, we can assume auth will be ready soon or redirect
        // For now, let's just log and continue
        console.log('Waiting for user authentication...');
        // We could use onAuthStateChanged here but typically the provider handles it.
        // Let's try to get the user from the context if we were using it, but here we depend on firebase auth directly in this function
      }

      // Fetch both task types in parallel for better performance
      // If user is not logged in, some of these might fail or return empty

      const fetchRecurring = async () => {
        if (!currentUser) return [];
        const token = await currentUser.getIdToken();
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        const recurringResponse = await fetch('/api/recurring-tasks?view=calendar', { headers });
        if (!recurringResponse.ok) {
          throw new Error('Failed to fetch recurring tasks');
        }
        return await recurringResponse.json();
      };

      const fetchLeaves = async () => {
        if (!currentUser) return [];
        // Only fetch approved leaves
        return await leaveService.getLeaveRequests({
          employeeId: currentUser.uid,
          status: 'approved'
        });
      };

      const [nonRecurringTasksData, recurringTasksData, leaveRequestsData] = await Promise.all([
        taskApi.getTasks().catch(e => { console.error(e); return []; }),
        fetchRecurring().catch(e => { console.error(e); return []; }),
        fetchLeaves().catch(e => { console.error(e); return []; })
      ]);

      // Store in separate state to enable memoization
      setNonRecurringTasks(nonRecurringTasksData);
      setRecurringTasks(recurringTasksData);
      setLeaveRequests(leaveRequestsData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, { ...newTask, isRecurring: false }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">View your tasks and leave schedule</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="text-white">
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <CalendarView tasks={tasks} />

      {/* Create Task Modal */}
      <TaskCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}