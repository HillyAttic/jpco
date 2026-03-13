'use client';

import React, { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  Bars3Icon,
  CalendarIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { RosterEntry, MONTHS } from '@/types/roster.types';
import { NonRecurringTask } from '@/services/nonrecurring-task.service';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  tasks: RosterEntry[];
  nonRecurringTasks: NonRecurringTask[];
}

interface RosterMobileCalendarViewProps {
  calendarDays: CalendarDay[];
  currentMonth: number;
  currentYear: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDateClick: (date: Date) => void;
  onTaskClick: (task: RosterEntry, e: React.MouseEvent) => void;
  onAddTask: (date: Date, taskType: 'single' | 'multi') => void;
  getTaskColorClass: (task: RosterEntry) => string;
}

export function RosterMobileCalendarView({
  calendarDays,
  currentMonth,
  currentYear,
  onPreviousMonth,
  onNextMonth,
  onDateClick,
  onTaskClick,
  onAddTask,
  getTaskColorClass
}: RosterMobileCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date);
      onDateClick(day.date);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSelectedDayTasks = () => {
    if (!selectedDate) return [];
    const day = calendarDays.find(d => 
      d.isCurrentMonth &&
      d.date.getDate() === selectedDate.getDate() &&
      d.date.getMonth() === selectedDate.getMonth() &&
      d.date.getFullYear() === selectedDate.getFullYear()
    );
    return day ? [...day.tasks, ...day.nonRecurringTasks.map(nrt => ({
      id: `nrt-${nrt.id}`,
      taskType: 'single' as const,
      userId: '',
      userName: '',
      taskDetail: nrt.title,
      clientName: nrt.title,
      timeStart: nrt.dueDate,
      timeEnd: nrt.dueDate,
      createdBy: '',
      isNonRecurringTask: true
    }))] : [];
  };

  return (
    <div className="bg-white dark:bg-gray-dark rounded-lg shadow max-w-md mx-auto">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {MONTHS[currentMonth - 1]}
        </h1>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <EllipsisVerticalIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onPreviousMonth}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {MONTHS[currentMonth - 1]} {currentYear}
          </div>
        </div>
        <button
          onClick={onNextMonth}
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
      <div className="grid grid-cols-7">
        {calendarDays.map((calDay, index) => {
          const todayClass = calDay.isCurrentMonth && isToday(calDay.date);
          const allTasks = [...calDay.tasks, ...calDay.nonRecurringTasks];

          return (
            <div
              key={index}
              className={`min-h-16 p-2 border-r border-b border-gray-100 dark:border-gray-700 relative ${
                !calDay.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
              } ${todayClass ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => handleDateClick(calDay)}
            >
              {calDay.isCurrentMonth && (
                <>
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    todayClass 
                      ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {calDay.day}
                  </div>

                  {/* Task Indicators */}
                  <div className="space-y-1">
                    {allTasks.slice(0, 2).map((task, taskIndex) => {
                      const isNonRecurring = 'title' in task;
                      return (
                        <div
                          key={isNonRecurring ? `nrt-${task.id}` : task.id}
                          className={`text-xs px-1 py-0.5 rounded text-white cursor-pointer hover:opacity-80 transition-opacity truncate ${
                            isNonRecurring 
                              ? 'bg-indigo-500' 
                              : task.taskDetail?.startsWith('OFF:')
                                ? 'bg-yellow-500'
                                : getTaskColorClass(task as RosterEntry).includes('orange')
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                          }`}
                          title={isNonRecurring ? (task as any).title : (task as RosterEntry).clientName || (task as RosterEntry).taskDetail}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isNonRecurring && !(task as RosterEntry).taskDetail?.startsWith('OFF:')) {
                              onTaskClick(task as RosterEntry, e);
                            }
                          }}
                        >
                          {isNonRecurring ? (task as any).title : (task as RosterEntry).clientName || (task as RosterEntry).taskDetail}
                        </div>
                      );
                    })}
                    {allTasks.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        +{allTasks.length - 2}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Tasks for {formatDate(selectedDate)}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask(selectedDate, 'single');
              }}
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
              title="Add Task"
            >
              <PlusCircleIcon className="w-5 h-5" />
            </button>
          </div>
          {getSelectedDayTasks().length > 0 ? (
            <div className="space-y-2">
              {getSelectedDayTasks().map((task) => {
                const isNonRecurring = 'isNonRecurringTask' in task && task.isNonRecurringTask;
                const isLeave = !isNonRecurring && (task as RosterEntry).taskDetail?.startsWith('OFF:');
                
                return (
                  <div
                    key={task.id}
                    className={`p-3 bg-white dark:bg-gray-dark rounded-lg border ${
                      isLeave ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                    } transition-colors`}
                    onClick={(e) => {
                      if (!isLeave && !isNonRecurring) {
                        onTaskClick(task as RosterEntry, e);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {isNonRecurring ? task.taskDetail : (task as RosterEntry).clientName || (task as RosterEntry).taskDetail}
                        </h4>
                        {!isNonRecurring && (task as RosterEntry).timeStart && (task as RosterEntry).timeEnd && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {new Date((task as RosterEntry).timeStart!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date((task as RosterEntry).timeEnd!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                        isNonRecurring 
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : isLeave
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {isNonRecurring ? 'Assigned' : isLeave ? 'Leave' : 'Task'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No tasks scheduled for this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
