'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/modal-context';
import { rosterService } from '@/services/roster.service';
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

  const canViewAllSchedules = isAdmin || isManager;

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

  const handleActivityClick = (activity: any, userName: string) => {
    setSelectedActivity({
      ...activity,
      userName,
    });
    setShowActivityModal(true);
    openModal(); // Open modal context to hide header
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
    closeModal(); // Close modal context to show header again
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
        const entryStart = new Date(entry.startDate);
        entryStart.setHours(0, 0, 0, 0); // Normalize to midnight
        const entryEnd = new Date(entry.endDate);
        entryEnd.setHours(0, 0, 0, 0); // Normalize to midnight
        return date >= entryStart && date <= entryEnd;
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
              {calDay.activities.map((activity: RosterEntry) => (
                <div
                  key={activity.id}
                  className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200"
                  title={activity.activityName}
                  onClick={() => handleActivityClick(activity, selectedUser?.name || '')}
                >
                  {activity.activityName}
                </div>
              ))}
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
        const entryStart = new Date(entry.startDate);
        entryStart.setHours(0, 0, 0, 0); // Normalize to midnight
        const entryEnd = new Date(entry.endDate);
        entryEnd.setHours(0, 0, 0, 0); // Normalize to midnight
        return date >= entryStart && date <= entryEnd;
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
              {calDay.activities.map((activity: RosterEntry) => (
                <div
                  key={activity.id}
                  className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate"
                  title={activity.activityName}
                >
                  {activity.activityName}
                </div>
              ))}
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
                      return (
                        <td
                          key={day}
                          colSpan={span}
                          className="border border-gray-300 px-1 py-2 text-center bg-red-100 text-red-800 font-medium cursor-pointer hover:bg-red-200 transition-colors overflow-hidden"
                          style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
                          title="Click to view details"
                          onClick={() => handleActivityClick(startingActivity, user.name)}
                        >
                          <div className="truncate text-xs">
                            {startingActivity.activityName}
                          </div>
                        </td>
                      );
                    } else if (dayActivities.length > 0) {
                      // This day is part of a spanning activity, skip rendering
                      return null;
                    } else {
                      return <td key={day} className="border border-gray-300 px-2 py-2 w-[50px] min-w-[50px] max-w-[50px]"></td>;
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
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Legend</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Scheduled Activity (Click to view details)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span>No Activity</span>
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
                  Activity Name
                </label>
                <p className="text-base text-gray-900 font-medium">
                  {selectedActivity.activityName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Start Date
                  </label>
                  <p className="text-base text-gray-900">
                    {new Date(selectedActivity.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    End Date
                  </label>
                  <p className="text-base text-gray-900">
                    {new Date(selectedActivity.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Duration
                </label>
                <p className="text-base text-gray-900">
                  {selectedActivity.endDay - selectedActivity.startDay + 1} day(s)
                </p>
              </div>

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
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Activities Summary</h4>
                <span className="text-sm text-gray-600">
                  {userCalendarEntries.length} activity{userCalendarEntries.length !== 1 ? 'ies' : ''} this month
                </span>
              </div>
              {userCalendarEntries.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                  {userCalendarEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 text-sm">
                      <span className="font-medium text-gray-900">{entry.activityName}</span>
                      <span className="text-gray-600">
                        {new Date(entry.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(entry.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
