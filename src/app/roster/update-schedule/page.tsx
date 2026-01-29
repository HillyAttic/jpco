'use client';

import { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { useModal } from '@/contexts/modal-context';
import { rosterService } from '@/services/roster.service';
import { RosterEntry, MONTHS, getDaysInMonth } from '@/types/roster.types';
import { Button } from '@/components/ui/button';
import { PlusCircleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  activities: RosterEntry[];
}

export default function UpdateSchedulePage() {
  const { user, loading: authLoading, userProfile } = useEnhancedAuth();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [formData, setFormData] = useState({
    activityName: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/sign-in');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadRosterEntries();
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
        activities: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const dayActivities = entries.filter(entry => {
        const entryStart = new Date(entry.startDate);
        const entryEnd = new Date(entry.endDate);
        return date >= entryStart && date <= entryEnd;
      });

      days.push({
        date,
        day,
        isCurrentMonth: true,
        activities: dayActivities,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      days.push({
        date: new Date(nextYear, nextMonth - 1, day),
        day,
        isCurrentMonth: false,
        activities: [],
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

  const handleAddActivity = () => {
    setEditingEntry(null);
    setFormData({
      activityName: '',
      startDate: '',
      endDate: '',
      notes: '',
    });
    setShowModal(true);
    openModal(); // Open modal context to hide header
  };

  const handleEditActivity = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setFormData({
      activityName: entry.activityName,
      startDate: new Date(entry.startDate).toISOString().split('T')[0],
      endDate: new Date(entry.endDate).toISOString().split('T')[0],
      notes: entry.notes || '',
    });
    setShowModal(true);
    openModal(); // Open modal context to hide header
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      await rosterService.deleteRosterEntry(id);
      await loadRosterEntries();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userProfile) return;

    try {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (startDate > endDate) {
        alert('Start date must be before end date');
        return;
      }

      const data = {
        userId: user.uid,
        userName: userProfile.name || userProfile.email || 'Unknown',
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

      setShowModal(false);
      closeModal(); // Close modal context to show header again
      await loadRosterEntries();
    } catch (error: any) {
      console.error('Error saving activity:', error);
      alert(error.message || 'Failed to save activity');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    closeModal(); // Close modal context to show header again
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Update Schedule</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your personal schedule and activities
          </p>
        </div>
        <Button onClick={handleAddActivity} className="text-white w-full sm:w-auto">
          <PlusCircleIcon className="w-5 h-5 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((calDay, index) => (
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
                {calDay.activities.map(activity => (
                  <div
                    key={activity.id}
                    className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200"
                    onClick={() => handleEditActivity(activity)}
                    title={activity.activityName}
                  >
                    {activity.activityName}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4">Your Activities</h3>
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No activities scheduled for this month</p>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{entry.activityName}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(entry.startDate).toLocaleDateString()} - {new Date(entry.endDate).toLocaleDateString()}
                  </p>
                  {entry.notes && <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditActivity(entry)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteActivity(entry.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingEntry ? 'Edit Activity' : 'Add Activity'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Name *
                </label>
                <input
                  type="text"
                  value={formData.activityName}
                  onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="e.g., Audit, Monthly Visit, ROC Filing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1 text-white">
                  {editingEntry ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
