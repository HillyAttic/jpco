'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/modal-context';
import { rosterService, getTaskColor } from '@/services/roster.service';
import { clientService, Client } from '@/services/client.service';
import { leaveService } from '@/services/leave.service';
import { LeaveRequest } from '@/types/attendance.types';
import { RosterEntry, MONTHS, getDaysInMonth, TaskType } from '@/types/roster.types';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  tasks: RosterEntry[];
}

export default function UpdateSchedulePage() {
  const { user, loading: authLoading, userProfile } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTaskTable, setShowTaskTable] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateTasks, setSelectedDateTasks] = useState<RosterEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [taskType, setTaskType] = useState<TaskType>('multi');
  const [formData, setFormData] = useState({
    activityName: '',
    startDate: '',
    endDate: '',
    notes: '',
    clientId: '',
    clientName: '',
    taskDetail: '',
    taskDate: '', // Store the date separately
    timeStart: '', // Now stores only time (HH:MM)
    timeEnd: '', // Now stores only time (HH:MM)
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/sign-in');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadRosterEntries();
      loadClients();
      loadLeaveRequests();
    }
  }, [user, currentMonth, currentYear]);

  const loadRosterEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await rosterService.getUserCalendarEvents(user.uid, currentMonth, currentYear);
      setEntries(data);
    } catch (error) {
      console.error('Error loading roster entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await clientService.getAll({ status: 'active' });
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadLeaveRequests = async () => {
    if (!user) return;

    try {
      const allLeaves = await leaveService.getLeaveRequests({
        employeeId: user.uid,
      });
      // Filter for approved leaves only
      const approvedLeaves = allLeaves.filter(leave => leave.status === 'approved');
      setLeaveRequests(approvedLeaves);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  // Helper function to format date for datetime-local input (avoids timezone issues)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format datetime for datetime-local input (avoids timezone issues)
  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        date: new Date(prevYear, prevMonth - 1, day),
        day,
        isCurrentMonth: false,
        tasks: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      date.setHours(0, 0, 0, 0);
      
      const dayTasks = entries.filter(entry => {
        if (entry.taskType === 'multi') {
          const entryStart = new Date(entry.startDate!);
          entryStart.setHours(0, 0, 0, 0);
          const entryEnd = new Date(entry.endDate!);
          entryEnd.setHours(0, 0, 0, 0);
          return date >= entryStart && date <= entryEnd;
        } else {
          const taskStart = new Date(entry.timeStart!);
          taskStart.setHours(0, 0, 0, 0);
          return date.getTime() === taskStart.getTime();
        }
      });

      // Check if there's a leave on this day
      const hasLeave = leaveRequests.some(leave => {
        if (!leave.startDate || !leave.endDate) return false;

        const startDate = leave.startDate instanceof Date
          ? leave.startDate
          : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

        const endDate = leave.endDate instanceof Date
          ? leave.endDate
          : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return date >= startDate && date <= endDate;
      });

      // Add leave indicator to tasks if there's a leave
      if (hasLeave) {
        const leaveOnDay = leaveRequests.find(leave => {
          if (!leave.startDate || !leave.endDate) return false;

          const startDate = leave.startDate instanceof Date
            ? leave.startDate
            : (leave.startDate as any).toDate ? (leave.startDate as any).toDate() : new Date((leave.startDate as any).seconds * 1000);

          const endDate = leave.endDate instanceof Date
            ? leave.endDate
            : (leave.endDate as any).toDate ? (leave.endDate as any).toDate() : new Date((leave.endDate as any).seconds * 1000);

          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);

          return date >= startDate && date <= endDate;
        });

        if (leaveOnDay) {
          // Create a pseudo-task for the leave
          dayTasks.push({
            id: `leave-${leaveOnDay.id}-${date.getTime()}`,
            taskType: 'single',
            userId: user!.uid,
            userName: userProfile?.displayName || userProfile?.email || 'Unknown',
            taskDetail: `OFF: ${leaveOnDay.leaveTypeName}`,
            timeStart: date,
            timeEnd: date,
            createdBy: user!.uid,
          } as RosterEntry);
        }
      }

      days.push({
        date,
        day,
        isCurrentMonth: true,
        tasks: dayTasks,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      days.push({
        date: new Date(nextYear, nextMonth - 1, day),
        day,
        isCurrentMonth: false,
        tasks: [],
      });
    }

    return days;
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

  const handleAddTask = (date: Date, type: TaskType) => {
    setEditingEntry(null);
    setTaskType(type);
    const dateStr = formatDateForInput(date);
    
    setFormData({
      activityName: '',
      startDate: dateStr,
      endDate: dateStr,
      notes: '',
      clientId: '',
      clientName: '',
      taskDetail: '',
      taskDate: dateStr, // Store the selected date
      timeStart: '09:00', // Only time
      timeEnd: '17:00', // Only time
    });
    setShowModal(true);
    openModal();
  };

  const handleEditTask = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setTaskType(entry.taskType);
    
    if (entry.taskType === 'multi') {
      setFormData({
        activityName: entry.activityName || '',
        startDate: entry.startDate ? formatDateForInput(new Date(entry.startDate)) : '',
        endDate: entry.endDate ? formatDateForInput(new Date(entry.endDate)) : '',
        notes: entry.notes || '',
        clientId: '',
        clientName: '',
        taskDetail: '',
        taskDate: '',
        timeStart: '',
        timeEnd: '',
      });
    } else {
      const startDateTime = entry.timeStart ? new Date(entry.timeStart) : null;
      const endDateTime = entry.timeEnd ? new Date(entry.timeEnd) : null;
      
      setFormData({
        activityName: '',
        startDate: '',
        endDate: '',
        notes: '',
        clientId: entry.clientId || '',
        clientName: entry.clientName || '',
        taskDetail: entry.taskDetail || '',
        taskDate: startDateTime ? formatDateForInput(startDateTime) : '',
        timeStart: startDateTime ? `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}` : '',
        timeEnd: endDateTime ? `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}` : '',
      });
    }
    
    setShowModal(true);
    openModal();
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await rosterService.deleteRosterEntry(id);
      await loadRosterEntries();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userProfile) return;

    try {
      if (taskType === 'multi') {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);

        if (startDate > endDate) {
          alert('Start date must be before end date');
          return;
        }

        const data: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'> = {
          taskType: 'multi',
          userId: user.uid,
          userName: userProfile.displayName || userProfile.email || 'Unknown',
          activityName: formData.activityName,
          startDate,
          endDate,
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear(),
          notes: formData.notes,
          createdBy: user.uid,
        };

        if (editingEntry) {
          await rosterService.updateRosterEntry(editingEntry.id!, data);
        } else {
          await rosterService.createRosterEntry(data);
        }
      } else {
        // Combine date with time for single tasks
        const [startHours, startMinutes] = formData.timeStart.split(':').map(Number);
        const [endHours, endMinutes] = formData.timeEnd.split(':').map(Number);
        
        const timeStart = new Date(formData.taskDate);
        timeStart.setHours(startHours, startMinutes, 0, 0);
        
        const timeEnd = new Date(formData.taskDate);
        timeEnd.setHours(endHours, endMinutes, 0, 0);

        if (timeStart > timeEnd) {
          alert('Start time must be before end time');
          return;
        }

        const selectedClient = clients.find(c => c.id === formData.clientId);

        const data: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'> = {
          taskType: 'single',
          userId: user.uid,
          userName: userProfile.displayName || userProfile.email || 'Unknown',
          clientId: formData.clientId || undefined,
          clientName: selectedClient?.name || formData.clientName || undefined,
          taskDetail: formData.taskDetail,
          timeStart,
          timeEnd,
        };

        if (editingEntry) {
          await rosterService.updateRosterEntry(editingEntry.id!, data);
        } else {
          await rosterService.createRosterEntry(data);
        }
      }

      setShowModal(false);
      closeModal();
      await loadRosterEntries();
    } catch (error: any) {
      console.error('Error saving task:', error);
      alert(error.message || 'Failed to save task');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    closeModal();
    setClientSearchQuery('');
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const handleDateClick = async (date: Date) => {
    if (!user) return;
    
    try {
      const tasks = await rosterService.getTasksForDate(user.uid, date);
      setSelectedDate(date);
      setSelectedDateTasks(tasks);
      setShowTaskTable(true);
      openModal();
    } catch (error) {
      console.error('Error loading tasks for date:', error);
    }
  };

  const handleCloseTaskTable = () => {
    setShowTaskTable(false);
    closeModal();
  };

  const getTaskColorClass = (task: RosterEntry): string => {
    // Check if it's a leave task
    if (task.taskDetail?.startsWith('OFF:')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    
    const color = getTaskColor(task);
    if (color === 'green') return 'bg-green-100 text-green-800 border-green-300';
    if (color === 'yellow') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const calendarDays = generateCalendarDays();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Update Schedule</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage your personal schedule and activities
          </p>
        </div>
      </div>

      {/* Color Legend */}
      <div className="bg-white dark:bg-gray-dark rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold mb-2">Task Duration Legend:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Less than 8 hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span>8 hours or more</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">
            {MONTHS[currentMonth - 1]} {currentYear}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers - Hidden on mobile */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="hidden md:block text-center font-semibold text-sm text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((calDay, index) => (
            <div
              key={index}
              className={`relative min-h-[100px] border border-gray-200 p-2 ${
                !calDay.isCurrentMonth ? 'bg-gray-50 md:block hidden' : 'bg-white'
              } ${calDay.isCurrentMonth ? 'hover:bg-blue-50 cursor-pointer' : ''} transition-colors group`}
              onMouseEnter={() => calDay.isCurrentMonth && setHoveredDay(index)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => calDay.isCurrentMonth && handleDateClick(calDay.date)}
            >
              <div className={`text-sm font-medium ${!calDay.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
                {calDay.day}
              </div>

              {/* Add Task Button - Always visible on mobile, hover on desktop */}
              {calDay.isCurrentMonth && (
                <div 
                  className={`absolute top-1 right-1 flex gap-1 z-10 ${
                    hoveredDay === index ? 'block' : 'block md:hidden'
                  }`} 
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleAddTask(calDay.date, 'single')}
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
                    title="Add Client Task"
                  >
                    <PlusCircleIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Tasks */}
              <div className="mt-1 space-y-1">
                {calDay.tasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className={`text-xs px-1 py-0.5 rounded truncate border ${getTaskColorClass(task)} ${
                      task.taskDetail?.startsWith('OFF:') ? 'cursor-default' : 'cursor-pointer hover:opacity-80 transition-opacity'
                    }`}
                    title={task.taskType === 'multi' ? task.activityName : (task.clientName || task.taskDetail)}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Don't allow editing leave tasks
                      if (!task.taskDetail?.startsWith('OFF:')) {
                        handleEditTask(task);
                      }
                    }}
                  >
                    {task.taskType === 'multi' ? task.activityName : (task.clientName || task.taskDetail)}
                  </div>
                ))}
                {calDay.tasks.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    +{calDay.tasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Form Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl w-full max-w-md mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {editingEntry ? 'Edit Task' : 'Add Task'}
            </h3>

            {/* Task Type Selector (only for new tasks) */}
            {!editingEntry && (
              <div className="mb-3 sm:mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskType('single')}
                    className={`flex-1 py-2 px-3 sm:px-4 text-sm sm:text-base rounded-lg border ${
                      taskType === 'single'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Client Task
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2 px-3 sm:px-4 text-sm sm:text-base rounded-lg border bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60"
                    title="Activity tasks are currently disabled"
                  >
                    <span className="hidden sm:inline">Activity (Coming Soon)</span>
                    <span className="sm:hidden">Activity</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {taskType === 'multi' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Activity Name *
                    </label>
                    <input
                      type="text"
                      value={formData.activityName}
                      onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="e.g., Audit, Monthly Visit, ROC Filing"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Additional details..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Task Detail *
                    </label>
                    <input
                      type="text"
                      value={formData.taskDetail}
                      onChange={(e) => setFormData({ ...formData, taskDetail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="e.g., GST filing and reconciliation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formData.taskDate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Date is automatically set from the calendar</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.timeStart}
                      onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.timeEnd}
                      onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 pb-4 sm:pb-2">
                <Button type="submit" className="w-full sm:flex-1 text-white min-h-[44px] sm:min-h-[40px]">
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="w-full sm:flex-1 min-h-[44px] sm:min-h-[40px]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Table Modal */}
      {showTaskTable && selectedDate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseTaskTable}
        >
          <div
            className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Tasks for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button
                onClick={handleCloseTaskTable}
                className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {selectedDateTasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tasks assigned for this day</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Client Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Task Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Start Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">End Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDateTasks
                      .sort((a, b) => {
                        const aStart = a.timeStart || a.startDate;
                        const bStart = b.timeStart || b.startDate;
                        return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                      })
                      .map((task) => {
                        const start = task.timeStart || task.startDate;
                        const end = task.timeEnd || task.endDate;
                        
                        return (
                          <tr key={task.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800">
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {start?.toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {task.clientName || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {task.taskDetail || task.activityName}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {start ? start.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                              {end ? end.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    handleCloseTaskTable();
                                    handleEditTask(task);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id!)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
