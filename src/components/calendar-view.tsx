'use client';

import React, { useState, useEffect } from 'react';
import { Task } from '@/types/task.types';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { RecurringTaskClientModal } from '@/components/recurring-tasks/RecurringTaskClientModal';
import { RecurringTask } from '@/services/recurring-task.service';
import { useModal } from '@/contexts/modal-context';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { auth } from '@/lib/firebase';

interface CalendarTask extends Task {
  isRecurring?: boolean;
  recurringTaskId?: string;
  recurrencePattern?: string;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

interface DailyStats {
  orange: number;
  yellow: number;
  green: number;
  total: number;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [fullRecurringTask, setFullRecurringTask] = useState<RecurringTask | null>(null);
  const { openModal, closeModal } = useModal();
  const { isAdmin, isManager } = useEnhancedAuth();
  const [rosterStats, setRosterStats] = useState<Record<number, DailyStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  const canViewRosterStats = isAdmin || isManager;

  // Fetch roster stats when month changes
  useEffect(() => {
    const fetchRosterStats = async () => {
      if (!canViewRosterStats) return;
      
      try {
        setLoadingStats(true);
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        const response = await fetch(
          `/api/roster/daily-stats?month=${month}&year=${year}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRosterStats(data.stats || {});
        }
      } catch (error) {
        console.error('Error fetching roster stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchRosterStats();
  }, [currentDate.getMonth(), currentDate.getFullYear(), canViewRosterStats]);

  const getDaysInMonth = (date: Date) => {
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
  };

  const getTasksForDate = (date: Date): CalendarTask[] => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getRecurrenceLabel = (pattern?: string) => {
    if (!pattern) return '';
    const labels: Record<string, string> = {
      'monthly': 'M',
      'quarterly': 'Q',
      'half-yearly': 'H',
      'yearly': 'Y'
    };
    return labels[pattern] || '';
  };

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
      
      // Fetch the full recurring task to get contactIds
      try {
        const response = await fetch(`/api/recurring-tasks/${task.recurringTaskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recurring task');
        }
        const recurringTask = await response.json();
        setFullRecurringTask(recurringTask);
        
        const contactIds = recurringTask.contactIds || [];
        
        // Fetch only the clients assigned to this task
        if (contactIds.length > 0) {
          const clientsResponse = await fetch('/api/clients');
          const clientsData = await clientsResponse.json();
          const allClients = clientsData.data || [];
          
          // Filter to only show assigned clients
          const assignedClients = allClients.filter((client: any) => 
            contactIds.includes(client.id)
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
      openModal(); // Hide header when modal opens
    } else if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleCloseModal = () => {
    setIsClientModalOpen(false);
    setSelectedTask(null);
    setFullRecurringTask(null);
    setClients([]);
    closeModal(); // Show header when modal closes
  };

  const days = getDaysInMonth(currentDate);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Render roster stats bar for a specific day
  const renderRosterStatsBar = (day: Date) => {
    const dayNumber = day.getDate();
    const stats = rosterStats[dayNumber];
    
    if (!stats || stats.total === 0) return null;

    const { orange, yellow, green, total } = stats;
    const orangePercent = (orange / total) * 100;
    const yellowPercent = (yellow / total) * 100;
    const greenPercent = (green / total) * 100;

    return (
      <div 
        className="mt-auto pt-1"
        title={`${orange} employees with 8+ hour tasks, ${yellow} with <8 hour tasks, ${green} with no tasks`}
      >
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
          {orange > 0 && (
            <div
              className="bg-orange-500 hover:bg-orange-600 transition-colors"
              style={{ width: `${orangePercent}%` }}
            />
          )}
          {yellow > 0 && (
            <div
              className="bg-yellow-500 hover:bg-yellow-600 transition-colors"
              style={{ width: `${yellowPercent}%` }}
            />
          )}
          {green > 0 && (
            <div
              className="bg-green-500 hover:bg-green-600 transition-colors"
              style={{ width: `${greenPercent}%` }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <ArrowPathIcon className="w-4 h-4" />
            <span>Recurring Task</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">M</span> = Monthly
            <span className="font-semibold">Q</span> = Quarterly
            <span className="font-semibold">H</span> = Half-Yearly
            <span className="font-semibold">Y</span> = Yearly
          </div>
          {canViewRosterStats && (
            <>
              <div className="border-l border-gray-300 h-4 mx-2"></div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Employee Status:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>8+ hrs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>&lt;8 hrs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>No tasks</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayTasks = day ? getTasksForDate(day) : [];
            const isToday = day && 
              day.getDate() === new Date().getDate() &&
              day.getMonth() === new Date().getMonth() &&
              day.getFullYear() === new Date().getFullYear();
            const isSelected = selectedDate && day && 
              day.getDate() === selectedDate.getDate() &&
              day.getMonth() === selectedDate.getMonth() &&
              day.getFullYear() === selectedDate.getFullYear();

            return (
              <div
                key={index}
                className={`min-h-24 p-1 border rounded flex flex-col ${
                  day ? 'border-gray-200 hover:bg-gray-50 cursor-pointer' : 'border-transparent'
                } ${isToday ? 'bg-blue-50 border-blue-300' : ''} ${
                  isSelected ? 'bg-blue-100 border-blue-400' : ''
                }`}
                onClick={() => day && setSelectedDate(day)}
              >
                {day ? (
                  <>
                    <div className={`text-sm font-medium ${
                      isToday ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="mt-1 space-y-1 max-h-20 overflow-y-auto flex-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(task, e)}
                          className={`text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}
                          title={`${task.title}${task.isRecurring ? ` (${task.recurrencePattern})` : ''}`}
                        >
                          {task.isRecurring && (
                            <span className="font-bold text-[10px]">
                              {getRecurrenceLabel(task.recurrencePattern)}
                            </span>
                          )}
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                    {canViewRosterStats && renderRosterStatsBar(day)}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              Tasks for {formatDate(selectedDate)}
            </h3>
            {getTasksForDate(selectedDate).length > 0 ? (
              <div className="space-y-2">
                {getTasksForDate(selectedDate).map(task => (
                  <div 
                    key={task.id} 
                    className="p-3 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={(e) => handleTaskClick(task, e)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.isRecurring && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              <ArrowPathIcon className="w-3 h-3" />
                              {task.recurrencePattern?.replace('-', ' ')}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tasks scheduled for this day.</p>
            )}
          </div>
        )}
      </div>

      {/* Client Tracking Modal */}
      {selectedTask && fullRecurringTask && (
        <RecurringTaskClientModal
          isOpen={isClientModalOpen}
          onClose={handleCloseModal}
          task={fullRecurringTask}
          clients={clients}
        />
      )}
    </div>
  );
}