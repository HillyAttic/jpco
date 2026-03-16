'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import {
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { authenticatedFetch } from '@/lib/api-client';
import { Client, clientService } from '@/services/client.service';

interface ScheduleEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ScheduleEntry {
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
}

interface ScheduleTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  currentUserId: string;
  teamMemberMappings?: Array<{
    userId: string;
    userName: string;
    clientIds: string[];
  }>;
  contactIds?: string[];
  onScheduled?: () => void;
}

export function ScheduleTaskModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentUserId,
  teamMemberMappings,
  contactIds,
  onScheduled,
}: ScheduleTaskModalProps) {
  const [employees, setEmployees] = useState<ScheduleEmployee[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get clients available for selected employee based on team member mapping
  const getClientsForEmployee = (employeeId: string): Client[] => {
    if (!employeeId) return [];

    // Find the mapping for this employee
    const mapping = teamMemberMappings?.find(m => m.userId === employeeId);
    if (mapping) {
      return allClients.filter(c => c.id && mapping.clientIds.includes(c.id));
    }

    // If no mapping, show all task clients
    const taskClientIds = contactIds || [];
    return allClients.filter(c => c.id && taskClientIds.includes(c.id));
  };

  // Load employees and clients
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load employees under this manager
        const empResponse = await authenticatedFetch('/api/manager-hierarchy/my-employees');
        if (empResponse.ok) {
          const emps: ScheduleEmployee[] = await empResponse.json();
          // Filter to only employees in the team member mappings if available
          if (teamMemberMappings && teamMemberMappings.length > 0) {
            const mappedUserIds = new Set(teamMemberMappings.map(m => m.userId));
            setEmployees(emps.filter(e => mappedUserIds.has(e.id)));
          } else {
            setEmployees(emps);
          }
        }

        // Load all clients for the task
        const allTaskClients = await clientService.getAll({ status: 'active', limit: 1000 });
        const taskClientIds = new Set<string>();

        // Collect all client IDs from mappings and contactIds
        teamMemberMappings?.forEach(m => m.clientIds.forEach(id => taskClientIds.add(id)));
        contactIds?.forEach(id => taskClientIds.add(id));

        setAllClients(allTaskClients.filter(c => c.id && taskClientIds.has(c.id)));
      } catch (error) {
        console.error('Error loading schedule data:', error);
        toast.error('Failed to load scheduling data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, teamMemberMappings, contactIds]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEntries([]);
      setSelectedEmployee('');
      setSelectedClient('');
      setScheduleDate('');
      setStartTime('09:00');
      setEndTime('17:00');
    }
  }, [isOpen]);

  // Update client selection when employee changes
  useEffect(() => {
    setSelectedClient('');
  }, [selectedEmployee]);

  const handleAddEntry = () => {
    if (!selectedEmployee || !selectedClient || !scheduleDate) {
      toast.error('Please select employee, client, and date');
      return;
    }

    const emp = employees.find(e => e.id === selectedEmployee);
    const client = allClients.find(c => c.id === selectedClient);

    if (!emp || !client) return;

    const newEntry: ScheduleEntry = {
      employeeId: emp.id,
      employeeName: emp.name,
      clientId: client.id!,
      clientName: client.clientName,
      scheduleDate,
      startTime,
      endTime,
    };

    setEntries(prev => [...prev, newEntry]);

    // Reset date for next entry (keep employee and client for batch scheduling)
    setScheduleDate('');
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (entries.length === 0) {
      toast.error('Please add at least one schedule entry');
      return;
    }

    setSaving(true);
    try {
      const response = await authenticatedFetch('/api/recurring-tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          taskTitle,
          scheduledBy: currentUserId,
          entries: entries.map(entry => ({
            userId: entry.employeeId,
            userName: entry.employeeName,
            clientId: entry.clientId,
            clientName: entry.clientName,
            scheduleDate: entry.scheduleDate,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully scheduled ${result.created || entries.length} roster entries!`);
        onScheduled?.();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Group entries by employee for display
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.employeeId]) {
      acc[entry.employeeId] = {
        employeeName: entry.employeeName,
        items: [],
      };
    }
    acc[entry.employeeId].items.push(entry);
    return acc;
  }, {} as Record<string, { employeeName: string; items: ScheduleEntry[] }>);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const availableClients = getClientsForEmployee(selectedEmployee);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-teal-600" />
            Schedule Task
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Schedule &quot;{taskTitle}&quot; for team members
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading scheduling data...
            </div>
          ) : (
            <>
              {/* Add Schedule Form */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <Label className="mb-3 block font-semibold">Add Schedule Entry</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employee Selection */}
                  <div>
                    <Label htmlFor="scheduleEmployee" className="flex items-center gap-2 mb-2">
                      <UserGroupIcon className="w-4 h-4" />
                      Select Employee
                    </Label>
                    <Select
                      id="scheduleEmployee"
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="w-full"
                    >
                      <option value="">Select employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Client Selection */}
                  <div>
                    <Label htmlFor="scheduleClient" className="flex items-center gap-2 mb-2">
                      Client
                    </Label>
                    <Select
                      id="scheduleClient"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full"
                      disabled={!selectedEmployee}
                    >
                      <option value="">
                        {selectedEmployee ? 'Select client...' : 'Select employee first'}
                      </option>
                      {availableClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.clientName} {client.businessName ? `(${client.businessName})` : ''}
                        </option>
                      ))}
                    </Select>
                    {selectedEmployee && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {availableClients.length} client{availableClients.length !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>

                  {/* Schedule Date */}
                  <div>
                    <Label htmlFor="schedDate" className="flex items-center gap-2 mb-2">
                      <CalendarDaysIcon className="w-4 h-4" />
                      Schedule Date
                    </Label>
                    <input
                      type="date"
                      id="schedDate"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="schedStartTime" className="mb-2 block">
                        Start Time
                      </Label>
                      <input
                        type="time"
                        id="schedStartTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="schedEndTime" className="mb-2 block">
                        End Time
                      </Label>
                      <input
                        type="time"
                        id="schedEndTime"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={handleAddEntry}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={!selectedEmployee || !selectedClient || !scheduleDate}
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add to Schedule
                  </Button>
                </div>
              </div>

              {/* Scheduled Entries */}
              {entries.length > 0 && (
                <div>
                  <Label className="mb-3 block font-semibold text-teal-700 dark:text-teal-400">
                    Scheduled Entries ({entries.length})
                  </Label>

                  {Object.entries(groupedEntries).map(([empId, group]) => (
                    <div
                      key={empId}
                      className="mb-4 border border-teal-200 dark:border-teal-800 rounded-lg overflow-hidden"
                    >
                      <div className="bg-teal-50 dark:bg-teal-900/30 px-4 py-2 border-b border-teal-200 dark:border-teal-800">
                        <span className="font-medium text-teal-800 dark:text-teal-300">
                          {group.employeeName}
                        </span>
                        <span className="text-xs text-teal-600 dark:text-teal-400 ml-2">
                          ({group.items.length} {group.items.length === 1 ? 'entry' : 'entries'})
                        </span>
                      </div>
                      <div className="bg-white dark:bg-gray-dark">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Client
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Date
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Time
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {group.items.map((entry, idx) => {
                              const globalIdx = entries.findIndex(
                                e =>
                                  e.employeeId === entry.employeeId &&
                                  e.clientId === entry.clientId &&
                                  e.scheduleDate === entry.scheduleDate &&
                                  e.startTime === entry.startTime
                              );
                              return (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                    {entry.clientName}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                    {formatDate(entry.scheduleDate)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                    {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEntry(globalIdx)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Box */}
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                <p className="text-sm text-teal-900 dark:text-teal-300">
                  <strong>How it works:</strong>
                </p>
                <ul className="text-sm text-teal-800 dark:text-teal-400 mt-2 ml-4 list-disc space-y-1">
                  <li>Select an employee, client, and date to schedule a visit</li>
                  <li>You can add multiple dates for the same employee/client</li>
                  <li>You can assign multiple clients to different employees</li>
                  <li>Scheduled visits will appear in each employee&apos;s roster</li>
                  <li>Admin can view all schedules at <strong>/roster/view-schedule</strong></li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {entries.length > 0 ? 'Cancel' : 'Close'}
          </Button>
          {entries.length > 0 && (
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={entries.length === 0 || saving}
              loading={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? 'Saving...' : `Save ${entries.length} Schedule${entries.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
