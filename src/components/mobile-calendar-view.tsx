'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task.types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  Bars3Icon,
  CalendarIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { RecurringTaskClientModal } from '@/components/recurring-tasks/RecurringTaskClientModal';
import { RecurringTask } from '@/services/recurring-task.service';
import { useModal } from '@/contexts/modal-context';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { auth } from '@/lib/firebase';  
import { authenticatedFetch } from '@/lib/api-client';

interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
}

interface MobileCalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

export function MobileCalendarView({ tasks, onTaskClick }: MobileCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [fullRecurringTask, setFullRecurringTask] = useState<RecurringTask | null>(null);
  const { openModal, closeModal } = useModal();
  const calendarGridRef = React.useRef<HTMLDivElement>(null);

  // Scroll to today's date when component mounts or month changes
  useEffect(() => {
    const scrollToToday = () => {
      if (!calendarGridRef.current) return;

      const today = new Date();
      const isCurrentMonth =
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear();

      if (isCurrentMonth) {
        // Find today's date element
        const todayElement = calendarGridRef.current.querySelector('[data-today="true"]');
        if (todayElement) {
          todayElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }
    };

    // Small delay to ensure DOM is rendered
    const timeoutId = setTimeout(scrollToToday, 100);
    return () => clearTimeout(timeoutId);
  }, [currentDate]);

  const getDaysInMonth = React.useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, []);

  const getTasksForDate = React.useCallback((date: Date): CalendarTask[] => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  }, [tasks]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTaskClick = async (task: CalendarTask, e: React.MouseEvent) => {
    e.stopPropagation();

    // If it's a recurring task, open the client modal
    if (task.isRecurring && task.recurringTaskId) {
      setSelectedTask(task);

      try {
        const response = await authenticatedFetch(`/api/recurring-tasks/${task.recurringTaskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recurring task');
        }
        const recurringTask = await response.json();
        setFullRecurringTask(recurringTask);

        const contactIds = recurringTask.contactIds || [];
        const teamMemberMappings = recurringTask.teamMemberMappings || [];

        const mappedClientIds = new Set<string>();
        teamMemberMappings.forEach((mapping: any) => {
          if (mapping.clientIds && Array.isArray(mapping.clientIds)) {
            mapping.clientIds.forEach((clientId: string) => mappedClientIds.add(clientId));
          }
        });

        const allClientIds = [...new Set([...contactIds, ...Array.from(mappedClientIds)])];

        if (allClientIds.length > 0) {
          const clientsResponse = await authenticatedFetch('/api/clients');
          const clientsData = await clientsResponse.json();
          const allClients = clientsData.data || [];

          const assignedClients = allClients.filter((client: any) =>
            allClientIds.includes(client.id)
          );

          setClients(assignedClients);
        } else {
          setClients([]);
        }
      } catch (error) {
        console.error('Error fetching task clients:', error);
        setClients([]);
        setFullRecurringTask(null);
      }

      setIsClientModalOpen(true);
      openModal();
    } else if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleCloseModal = () => {
    setIsClientModalOpen(false);
    setSelectedTask(null);
    setFullRecurringTask(null);
    setClients([]);
    closeModal();
  };

  const days = React.useMemo(() => getDaysInMonth(currentDate), [currentDate, getDaysInMonth]);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getTaskColor = (task: CalendarTask) => {
    if (task.priority === 'urgent') return 'bg-red-500';
    if (task.priority === 'high') return 'bg-orange-500';
    if (task.priority === 'medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg shadow max-w-md mx-auto">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {currentDate.toLocaleDateString('en-US', { month: 'long' })}
        </h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
          <CalendarIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <EllipsisVerticalIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {weekdays.map((day, index) => (
          <div key={index} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div ref={calendarGridRef} className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayTasks = day ? getTasksForDate(day) : [];
          const todayClass = day && isToday(day);

          return (
            <div
              key={index}
              className={`min-h-16 p-2 border-r border-b border-gray-100 dark:border-gray-700 relative ${
                !day ? 'bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
              } ${todayClass ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => {
                if (day) {
                  setSelectedDate(day);
                  setShowTaskModal(true);
                }
              }}
              data-today={todayClass ? 'true' : 'false'}
            >
              {day && (
                <>
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    todayClass 
                      ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* Task Indicators */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task, taskIndex) => (
                      <div
                        key={task.id}
                        onClick={(e) => handleTaskClick(task, e)}
                        className={`text-xs px-2 py-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity truncate ${getTaskColor(task)}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      {showTaskModal && selectedDate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTaskModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Tasks for {formatDate(selectedDate)}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {getTasksForDate(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getTasksForDate(selectedDate).map(task => (
                  <div
                    key={task.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => {
                      setShowTaskModal(false);
                      handleTaskClick(task, e);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                          {task.isRecurring && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                              <ArrowPathIcon className="w-3 h-3" />
                              {task.recurrencePattern?.replace('-', ' ')}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{task.description}</p>
                        )}
                        {task.category && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Category: {task.category}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        task.status === 'in-progress' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 rounded ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {task.priority}
                      </span>
                      {task.assignedTo && task.assignedTo.length > 0 && (
                        <span>Assigned to: {task.assignedTo.length} user(s)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tasks scheduled for this day.</p>
            )}
          </div>
        </div>
      )}

      {/* Client Tracking Modal */}
      {selectedTask && fullRecurringTask && (
        <RecurringTaskClientModal
          isOpen={isClientModalOpen}
          onClose={handleCloseModal}
          task={fullRecurringTask}
          clients={clients}
          viewingMonth={currentDate}
        />
      )}
    </div>
  );
}