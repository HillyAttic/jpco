'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
  createdAt: Date;
  scope?: 'global' | 'manager';
  createdBy?: string;
  createdByName?: string | null;
  createdByRole?: string | null;
}

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  managerId?: string;
  isManager?: boolean;
  isAdmin?: boolean;
}

const roleLabel = (role: string): string => role.charAt(0).toUpperCase() + role.slice(1);

/** API returns an ISO string; the rest of this component works in YYYY-MM-DD. */
const toDateKey = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function HolidayManagementModal({ isOpen, onClose, managerId, isManager, isAdmin }: HolidayManagementModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  // Fetch holidays — already scoped to this user by the server
  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/holidays');
      if (!res.ok) throw new Error(`Failed to load holidays (${res.status})`);

      const data: any[] = await res.json();
      setHolidays(
        data.map((h) => ({
          id: h.id,
          date: toDateKey(h.date),
          name: h.name,
          description: h.description,
          createdAt: new Date(h.createdAt),
          scope: h.scope === 'manager' ? 'manager' : 'global',
          createdBy: h.createdBy || undefined,
          createdByName: h.createdByName || null,
          createdByRole: h.createdByRole || null,
        }))
      );
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
      // Reset form
      setHolidayDate('');
      setHolidayName('');
      setHolidayDescription('');
    }
  }, [isOpen]);

  // Add holiday
  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayName.trim()) {
      alert('Please enter both date and holiday name');
      return;
    }

    setSaving(true);
    try {
      // The server decides the scope: a manager's holiday covers only their team
      const res = await authenticatedFetch('/api/holidays', {
        method: 'POST',
        body: JSON.stringify({
          date: new Date(holidayDate + 'T00:00:00').toISOString(),
          name: holidayName.trim(),
          description: holidayDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error(`Failed to add holiday (${res.status})`);

      // Reset form
      setHolidayDate('');
      setHolidayName('');
      setHolidayDescription('');

      // Refresh list
      await fetchHolidays();

      alert('Holiday added successfully!');
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/holidays/${holidayId}`, { method: 'DELETE' });
      if (!res.ok) {
        // Surface the server's message — a 404 here is either "no such route"
        // (HTML body) or "no such holiday" (JSON body)
        throw new Error(`Failed to delete holiday (${res.status}): ${await res.text()}`);
      }

      await fetchHolidays();
      alert('Holiday deleted successfully!');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  // Format date for display (dateValue is a YYYY-MM-DD string)
  const formatDate = (dateValue: string) => {
    const date = new Date(dateValue + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Manage Holidays
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Holiday Form */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add New Holiday</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holidayDate">Date *</Label>
                <input
                  id="holidayDate"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="holidayName">Holiday Name *</Label>
                <input
                  id="holidayName"
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Independence Day"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="holidayDescription">Description (Optional)</Label>
                <input
                  id="holidayDescription"
                  type="text"
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  placeholder="e.g., National Holiday"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {isManager && !isAdmin && (
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                This holiday will apply to your team only.
              </p>
            )}

            <Button
              onClick={handleAddHoliday}
              disabled={saving || !holidayDate || !holidayName.trim()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holiday
                </>
              )}
            </Button>
          </div>

          {/* Holidays List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Existing Holidays ({holidays.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                No holidays added yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                          <div className="text-xs text-blue-600 font-medium">
                            {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-2xl font-bold text-blue-700">
                            {new Date(holiday.date + 'T00:00:00').getDate()}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {holiday.name}
                            <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${
                              holiday.scope === 'manager'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}>
                              {holiday.scope === 'manager' ? 'Team' : 'Global'}
                            </span>
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(holiday.date)}
                            {holiday.createdByName && (
                              <span className="text-xs">
                                {' · '}Marked by {holiday.createdByName}
                                {holiday.createdByRole ? ` (${roleLabel(holiday.createdByRole)})` : ''}
                              </span>
                            )}
                          </p>
                          {holiday.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{holiday.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Managers can only delete their own holidays, admins can delete any */}
                    {(isAdmin || (isManager && holiday.scope === 'manager' && holiday.createdBy === managerId)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
