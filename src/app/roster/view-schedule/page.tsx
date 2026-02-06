'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/modal-context';
import { rosterService, getTaskColor } from '@/services/roster.service';
import { RosterEntry, MONTHS, getDaysInMonth, MonthlyRosterView } from '@/types/roster.types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ViewSchedulePage() {
  const { user, loading: authLoading, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [monthlyView, setMonthlyView] = useState<MonthlyRosterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserCalendarModal, setShowUserCalendarModal] = useState(false);
  const [userCalendarEntries, setUserCalendarEntries] = useState<RosterEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateTasks, setSelectedDateTasks] = useState<RosterEntry[]>([]);
  const [showDayTasksModal, setShowDayTasksModal] = useState(false);
  const [selectedDayInUserCalendar, setSelectedDayInUserCalendar] = useState<number | null>(null);
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<RosterEntry[]>([]);

  const canViewAllSchedules = isAdmin || isManager;

  // Helper function to get color classes based on task duration
  const getTaskColorClass = (task: RosterEntry): string => {
    const color = getTaskColor(task);
    if (color === 'green') return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    if (color === 'yellow') return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
    return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200';
  };

  // Helper function to get Excel cell color classes
  const getExcelCellColorClass = (task: RosterEntry): string => {
    const color = getTaskColor(task);
    if (color === 'green') return 'bg-green-100 text-green-800 hover:bg-green-200';
    if (color === 'yellow') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/sign-in');
    } else if (!authLoading && user && !canViewAllSchedules) {
      // Redirect employees to their own update-schedule page
      router.push('/roster/update-schedule');
    }
  }, [user, authLoading, router, canViewAllSchedules]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentMonth, currentYear, canViewAllSchedules]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (canViewAllSchedules) {
        // Load all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.displayName || data.email || 'Unknown User',
            email: data.email || '',
            role: data.role || 'employee',
          };
        }) as UserProfile[];
        setUsers(usersData);

        // Load monthly roster view
        const view = await rosterService.getMonthlyRosterView(currentMonth, currentYear);
        setMonthlyView(view);
      } else {
        // Load only user's own entries
        const data = await rosterService.getUserCalendarEvents(user.uid, currentMonth, currentYear);
        setEntries(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleActivityClick = async (activity: any, userName: string, userId: string, day: number) => {
    try {
      // Create the date for the clicked day
      const clickedDate = new Date(currentYear, currentMonth - 1, day);
      
      // Fetch all tasks for this user on this specific day
      const allUserTasks = await rosterService.getUserCalendarEvents(userId, currentMonth, currentYear);
      
      // Filter tasks that occur on the clicked day
      const tasksForDay = allUserTasks.filter(task => {
        if (task.taskType === 'multi' && task.startDate && task.endDate) {
          const taskStart = new Date(task.startDate);
          taskStart.setHours(0, 0, 0, 0);
          const taskEnd = new Date(task.endDate);
          taskEnd.setHours(0, 0, 0, 0);
          const checkDate = new Date(clickedDate);
          checkDate.setHours(0, 0, 0, 0);
          return checkDate >= taskStart && checkDate <= taskEnd;
        } else if (task.taskType === 'single' && task.timeStart) {
          const taskStart = new Date(task.timeStart);
          taskStart.setHours(0, 0, 0, 0);
          const checkDate = new Date(clickedDate);
          checkDate.setHours(0, 0, 0, 0);
          return taskStart.getTime() === checkDate.getTime();
        }
        return false;
      });

      setSelectedDate(clickedDate);
      setSelectedDateTasks(tasksForDay);
      setSelectedUser({ id: userId, name: userName, email: '', role: '' });
      setShowDayTasksModal(true);
      openModal();
    } catch (error) {
      console.error('Error loading tasks for day:', error);
    }
  };

  const handleCloseDayTasksModal = () => {
    setShowDayTasksModal(false);
    setSelectedDate(null);
    setSelectedDateTasks([]);
    setSelectedUser(null);
    closeModal();
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedActivity(null);
    closeModal(); // Close modal context to show header again
  };

  const handleUserNameClick = async (user: UserProfile) => {
    try {
      setSelectedUser(user);
      // Load user's calendar entries for the current month
      const entries = await rosterService.getUserCalendarEvents(user.id, currentMonth, currentYear);
      setUserCalendarEntries(entries);
      setShowUserCalendarModal(true);
      openModal(); // Open modal context to hide header
    } catch (error) {
      console.error('Error loading user calendar:', error);
    }
  };

  const handleCloseUserCalendarModal = () => {
    setShowUserCalendarModal(false);
    setSelectedUser(null);
    setUserCalendarEntries([]);
    setSelectedDayInUserCalendar(null);
    setTasksForSelectedDay([]);
    closeModal(); // Close modal context to show header again
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Handle clicking on a task in the user calendar modal
  const handleTaskClickInUserCalendar = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth - 1, day);
    
    // Filter tasks that occur on the clicked day
    const tasksForDay = userCalendarEntries.filter(task => {
      if (task.taskType === 'multi' && task.startDate && task.endDate) {
        const taskStart = new Date(task.startDate);
        taskStart.setHours(0, 0, 0, 0);
        const taskEnd = new Date(task.endDate);
        taskEnd.setHours(0, 0, 0, 0);
        const checkDate = new Date(clickedDate);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= taskStart && checkDate <= taskEnd;
      } else if (task.taskType === 'single' && task.timeStart) {
        const taskStart = new Date(task.timeStart);
        taskStart.setHours(0, 0, 0, 0);
        const checkDate = new Date(clickedDate);
        checkDate.setHours(0, 0, 0, 0);
        return taskStart.getTime() === checkDate.getTime();
      }
      return false;
    });

    setSelectedDayInUserCalendar(day);
    setTasksForSelectedDay(tasksForDay);
  };

  const renderUserCalendarInModal = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days: any[] = [];

    // Previous month days
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        activities: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      date.setHours(0, 0, 0, 0); // Normalize to midnight
      
      const dayActivities = userCalendarEntries.filter(entry => {
        if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
          const entryStart = new Date(entry.startDate);
          entryStart.setHours(0, 0, 0, 0);
          const entryEnd = new Date(entry.endDate);
          entryEnd.setHours(0, 0, 0, 0);
          return date >= entryStart && date <= entryEnd;
        } else if (entry.taskType === 'single' && entry.timeStart) {
          const taskStart = new Date(entry.timeStart);
          taskStart.setHours(0, 0, 0, 0);
          return date.getTime() === taskStart.getTime();
        }
        return false;
      });

      days.push({
        day,
        isCurrentMonth: true,
        activities: dayActivities,
      });
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}
        {days.map((calDay, index) => (
          <div
            key={index}
            className={`min-h-[80px] border border-gray-200 p-1 ${
              !calDay.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className={`text-sm ${!calDay.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
              {calDay.day}
            </div>
            <div className="mt-1 space-y-1">
              {calDay.activities.map((activity: RosterEntry) => {
                const displayName = activity.taskType === 'multi' 
                  ? activity.activityName 
                  : activity.taskDetail;
                return (
                  <div
                    key={activity.id}
                    className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer border transition-colors ${getTaskColorClass(activity)}`}
                    title={displayName}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClickInUserCalendar(calDay.day);
                    }}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUserCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days: any[] = [];

    // Previous month days
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        activities: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      date.setHours(0, 0, 0, 0); // Normalize to midnight
      
      const dayActivities = entries.filter(entry => {
        if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
          const entryStart = new Date(entry.startDate);
          entryStart.setHours(0, 0, 0, 0);
          const entryEnd = new Date(entry.endDate);
          entryEnd.setHours(0, 0, 0, 0);
          return date >= entryStart && date <= entryEnd;
        } else if (entry.taskType === 'single' && entry.timeStart) {
          const taskStart = new Date(entry.timeStart);
          taskStart.setHours(0, 0, 0, 0);
          return date.getTime() === taskStart.getTime();
        }
        return false;
      });

      days.push({
        day,
        isCurrentMonth: true,
        activities: dayActivities,
      });
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}
        {days.map((calDay, index) => (
          <div
            key={index}
            className={`min-h-[80px] border border-gray-200 p-1 ${
              !calDay.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className={`text-sm ${!calDay.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
              {calDay.day}
            </div>
            <div className="mt-1 space-y-1">
              {calDay.activities.map((activity: RosterEntry) => {
                const displayName = activity.taskType === 'multi' 
                  ? activity.activityName 
                  : activity.taskDetail;
                return (
                  <div
                    key={activity.id}
                    className={`text-xs px-1 py-0.5 rounded truncate border ${getTaskColorClass(activity)}`}
                    title={displayName}
                  >
                    {displayName}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderExcelView = () => {
    if (!monthlyView) return null;

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left font-semibold sticky left-0 bg-gray-100 z-10 whitespace-nowrap min-w-[150px]">
                EMP NAME
              </th>
              {days.map(day => (
                <th key={day} className="border border-gray-300 px-2 py-2 text-center font-semibold w-[50px] min-w-[50px] max-w-[50px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const employeeData = monthlyView.employees.find(e => e.userId === user.id);
              const activities = employeeData?.activities || [];

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td 
                    className="border border-gray-300 px-4 py-2 font-medium sticky left-0 bg-white z-10 whitespace-nowrap min-w-[150px] cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => handleUserNameClick(user)}
                    title="Click to view full calendar"
                  >
                    {user.name}
                  </td>
                  {days.map(day => {
                    // Find activities that span this day
                    const dayActivities = activities.filter(
                      activity => day >= activity.startDay && day <= activity.endDay
                    );

                    // Check if this is the start of an activity
                    const startingActivity = dayActivities.find(a => a.startDay === day);

                    if (startingActivity) {
                      const span = startingActivity.endDay - startingActivity.startDay + 1;
                      const cellWidth = span * 50; // 50px per cell
                      const displayName = startingActivity.activityName 
                        || startingActivity.taskDetail 
                        || 'Task';
                      
                      // Create a temporary RosterEntry object for color calculation
                      const taskForColor: RosterEntry = {
                        taskType: startingActivity.taskType || 'multi',
                        userId: user.id,
                        userName: user.name,
                        startDate: startingActivity.startDate,
                        endDate: startingActivity.endDate,
                        activityName: startingActivity.activityName,
                        clientName: startingActivity.clientName,
                        taskDetail: startingActivity.taskDetail,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      };
                      
                      return (
                        <td
                          key={day}
                          colSpan={span}
                          className={`border border-gray-300 px-1 py-2 text-center font-medium cursor-pointer transition-colors overflow-hidden ${getExcelCellColorClass(taskForColor)}`}
                          style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
                          title="Click to view all tasks for this day"
                          onClick={() => handleActivityClick(startingActivity, user.name, user.id, day)}
                        >
                          <div className="truncate text-xs">
                            {displayName}
                          </div>
                        </td>
                      );
                    } else if (dayActivities.length > 0) {
                      // This day is part of a spanning activity, skip rendering
                      return null;
                    } else {
                      // Empty day - show green background to indicate no task assigned
                      return (
                        <td 
                          key={day} 
                          className="border border-gray-300 px-2 py-2 w-[50px] min-w-[50px] max-w-[50px] bg-green-100"
                        ></td>
                      );
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !canViewAllSchedules) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">View Schedule</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {canViewAllSchedules
              ? 'Organization-wide roster view'
              : 'Your personal schedule'}
          </p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">
            Monthly ({MONTHS[currentMonth - 1]} {currentYear})
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        {canViewAllSchedules ? renderExcelView() : renderUserCalendar()}
      </div>

      {/* Legend for Excel View */}
      {canViewAllSchedules && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Task Duration Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-gray-300 rounded"></div>
              <span>No task assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Task: Less than 8 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Task: 8 hours or more</span>
            </div>
          </div>
        </div>
      )}

      {/* Day Tasks Table Modal */}
      {showDayTasksModal && selectedDate && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseDayTasksModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedUser.name}'s Tasks
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button
                  onClick={handleCloseDayTasksModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No tasks assigned for this day</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                          Date
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                          Client Name
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                          Task Name
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                          Start Time
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                          End Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateTasks
                        .sort((a, b) => {
                          const aStart = a.timeStart || a.startDate;
                          const bStart = b.timeStart || b.startDate;
                          return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                        })
                        .map((task, index) => {
                          const start = task.timeStart || task.startDate;
                          const end = task.timeEnd || task.endDate;
                          
                          return (
                            <tr key={task.id || index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                {start ? start.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }) : '—'}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                {task.clientName || '—'}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                {task.taskDetail || task.activityName || '—'}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                {start ? start.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : '—'}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                {end ? end.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
              <button
                onClick={handleCloseDayTasksModal}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {showActivityModal && selectedActivity && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseActivityModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Activity Details</h3>
              <button
                onClick={handleCloseActivityModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Employee
                </label>
                <p className="text-base text-gray-900 font-medium">
                  {selectedActivity.userName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  {selectedActivity.taskType === 'multi' ? 'Activity Name' : 'Client Name'}
                </label>
                <p className="text-base text-gray-900 font-medium">
                  {selectedActivity.taskType === 'multi' ? selectedActivity.activityName : selectedActivity.clientName}
                </p>
              </div>

              {selectedActivity.taskType === 'single' && selectedActivity.taskDetail && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Task Detail
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedActivity.taskDetail}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {selectedActivity.taskType === 'multi' ? 'Start Date' : 'Start Time'}
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedActivity.taskType === 'multi' && selectedActivity.startDate
                      ? new Date(selectedActivity.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : selectedActivity.timeStart
                      ? new Date(selectedActivity.timeStart).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {selectedActivity.taskType === 'multi' ? 'End Date' : 'End Time'}
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedActivity.taskType === 'multi' && selectedActivity.endDate
                      ? new Date(selectedActivity.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : selectedActivity.timeEnd
                      ? new Date(selectedActivity.timeEnd).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedActivity.startDay && selectedActivity.endDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Duration
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedActivity.endDay - selectedActivity.startDay + 1} day(s)
                  </p>
                </div>
              )}

              {selectedActivity.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Notes
                  </label>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">
                    {selectedActivity.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={handleCloseActivityModal}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Calendar Modal */}
      {showUserCalendarModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseUserCalendarModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedUser.name}'s Schedule</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {MONTHS[currentMonth - 1]} {currentYear}
                  </p>
                </div>
                <button
                  onClick={handleCloseUserCalendarModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {renderUserCalendarInModal()}
              
              {/* Task Details Table - Shows below calendar when a day is selected */}
              {selectedDayInUserCalendar !== null && tasksForSelectedDay.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Tasks for {MONTHS[currentMonth - 1]} {selectedDayInUserCalendar}, {currentYear}
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedDayInUserCalendar(null);
                        setTasksForSelectedDay([]);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                            Date
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                            Client Name
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                            Task Name
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                            Start Time
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                            End Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasksForSelectedDay
                          .sort((a, b) => {
                            const aStart = a.timeStart || a.startDate;
                            const bStart = b.timeStart || b.startDate;
                            return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                          })
                          .map((task, index) => {
                            const start = task.timeStart || task.startDate;
                            const end = task.timeEnd || task.endDate;
                            
                            return (
                              <tr key={task.id || index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                  {start ? start.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  }) : '—'}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                  {task.clientName || '—'}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                  {task.taskDetail || task.activityName || '—'}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                  {start ? start.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  }) : '—'}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                  {end ? end.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  }) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
              <button
                onClick={handleCloseUserCalendarModal}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
