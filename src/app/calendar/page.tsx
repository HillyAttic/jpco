'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/task.types';
import { taskApi } from '@/services/task.api';
import { recurringTaskService, RecurringTask } from '@/services/recurring-task.service';
import { calculateAllOccurrences } from '@/utils/recurrence-scheduler';
import { CalendarView } from '@/components/calendar-view';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { TaskCreationModal } from '@/components/task-creation-modal';

// Extended task type to include recurring task occurrences
interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch non-recurring tasks
      const nonRecurringTasks = await taskApi.getTasks();
      
      // Fetch recurring tasks
      const recurringTasks = await recurringTaskService.getAll();
      
      // Convert recurring tasks to calendar tasks with all occurrences
      const recurringCalendarTasks = generateRecurringTaskOccurrences(recurringTasks);
      
      // Combine both types of tasks
      const allTasks = [
        ...nonRecurringTasks.map(task => ({ ...task, isRecurring: false })),
        ...recurringCalendarTasks
      ];
      
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate calendar task occurrences from recurring tasks
   * Creates individual task entries for each occurrence based on recurrence pattern
   */
  const generateRecurringTaskOccurrences = (recurringTasks: RecurringTask[]): CalendarTask[] => {
    const calendarTasks: CalendarTask[] = [];
    
    // Get date range for calendar (current month - 6 months to + 5 years for better visibility)
    const calendarStartDate = new Date();
    calendarStartDate.setMonth(calendarStartDate.getMonth() - 6);
    calendarStartDate.setDate(1);
    
    const calendarEndDate = new Date();
    calendarEndDate.setFullYear(calendarEndDate.getFullYear() + 5); // Extended to 5 years
    calendarEndDate.setMonth(11); // December
    calendarEndDate.setDate(31); // Last day of year
    
    recurringTasks.forEach(recurringTask => {
      // Skip paused tasks
      if (recurringTask.isPaused) return;
      
      // Calculate task start and end dates
      const taskStartDate = new Date(recurringTask.startDate);
      // If no end date is specified, use the calendar's extended end date (5 years)
      // This allows unlimited recurring tasks to show for a reasonable future period
      const taskEndDate = recurringTask.endDate ? new Date(recurringTask.endDate) : calendarEndDate;
      
      // Calculate occurrences within the date range
      const occurrenceStartDate = taskStartDate > calendarStartDate ? taskStartDate : calendarStartDate;
      const occurrenceEndDate = taskEndDate < calendarEndDate ? taskEndDate : calendarEndDate;
      
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
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-2">View your tasks on a calendar</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="text-white">
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          Add Task
        </Button>
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