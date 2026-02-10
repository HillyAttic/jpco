'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
  createdAt: Date;
}

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HolidayManagementModal({ isOpen, onClose }: HolidayManagementModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  // Fetch holidays
  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'holidays'), orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      
      const holidayList: Holiday[] = snapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date,
        name: doc.data().name,
        description: doc.data().description,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      
      setHolidays(holidayList);
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
      await addDoc(collection(db, 'holidays'), {
        date: holidayDate,
        name: holidayName.trim(),
        description: holidayDescription.trim() || '',
        createdAt: new Date(),
      });

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
      await deleteDoc(doc(db, 'holidays', holidayId));
      await fetchHolidays();
      alert('Holiday deleted successfully!');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert('Failed to delete holiday');
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
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
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Holiday</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holidayDate">Date *</Label>
                <input
                  id="holidayDate"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

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
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Existing Holidays ({holidays.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                No holidays added yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
                          <h4 className="font-semibold text-gray-900">{holiday.name}</h4>
                          <p className="text-sm text-gray-600">{formatDate(holiday.date)}</p>
                          {holiday.description && (
                            <p className="text-xs text-gray-500 mt-1">{holiday.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
