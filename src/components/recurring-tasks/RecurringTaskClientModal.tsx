'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { RecurringTask } from '@/services/recurring-task.service';
import { taskCompletionService } from '@/services/task-completion.service';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';

interface Client {
  id: string;
  name: string;
  email?: string;
}

interface ClientCompletion {
  clientId: string;
  completedMonths: string[]; // Array of month keys like "2025-04", "2025-05"
}

interface RecurringTaskClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: RecurringTask | null;
  clients: Client[];
}

/**
 * RecurringTaskClientModal Component
 * Shows all clients with checkboxes for each month from April to March
 * Displays months based on recurrence pattern (monthly shows all, quarterly shows every 3 months)
 */
export function RecurringTaskClientModal({
  isOpen,
  onClose,
  task,
  clients,
}: RecurringTaskClientModalProps) {
  const [clientCompletions, setClientCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useEnhancedAuth();

  // Generate months from April to March (financial year)
  const generateMonths = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    const startMonth = 3; // April (0-indexed)
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (startMonth + i) % 12;
      const year = monthIndex < startMonth ? currentYear + 1 : currentYear;
      const date = new Date(year, monthIndex, 1);
      months.push({
        key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthName: date.toLocaleDateString('en-US', { month: 'short' }),
        fullDate: date,
      });
    }
    return months;
  };

  // Filter months based on recurrence pattern
  const getVisibleMonths = () => {
    const allMonths = generateMonths();
    
    if (!task) return allMonths;

    switch (task.recurrencePattern) {
      case 'monthly':
        return allMonths; // Show all 12 months
      case 'quarterly':
        // Show every 3rd month starting from April
        return allMonths.filter((_, index) => index % 3 === 0);
      case 'half-yearly':
        // Show every 6th month
        return allMonths.filter((_, index) => index % 6 === 0);
      case 'yearly':
        // Show only April
        return [allMonths[0]];
      default:
        return allMonths;
    }
  };

  const visibleMonths = getVisibleMonths();

  // Initialize client completions from task data
  useEffect(() => {
    if (task && isOpen && task.id) {
      loadCompletions();
    }
  }, [task, clients, isOpen]);

  const loadCompletions = async () => {
    if (!task || !task.id) return;
    
    setLoading(true);
    try {
      const completions = new Map<string, Set<string>>();
      
      // Initialize all clients with empty sets
      clients.forEach(client => {
        completions.set(client.id, new Set());
      });

      // Load completion data from Firestore
      const taskCompletions = await taskCompletionService.getByTaskId(task.id);
      
      taskCompletions.forEach(completion => {
        if (completion.isCompleted) {
          const clientMonths = completions.get(completion.clientId) || new Set<string>();
          clientMonths.add(completion.monthKey);
          completions.set(completion.clientId, clientMonths);
        }
      });
      
      setClientCompletions(completions);
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = (clientId: string, monthKey: string) => {
    setClientCompletions(prev => {
      const newMap = new Map(prev);
      const clientMonths = new Set<string>(newMap.get(clientId) || new Set<string>());
      
      if (clientMonths.has(monthKey)) {
        clientMonths.delete(monthKey);
      } else {
        clientMonths.add(monthKey);
      }
      
      newMap.set(clientId, clientMonths);
      return newMap;
    });
  };

  const isCompleted = (clientId: string, monthKey: string) => {
    return clientCompletions.get(clientId)?.has(monthKey) || false;
  };

  const getCompletionStats = (clientId: string) => {
    const completed = clientCompletions.get(clientId)?.size || 0;
    const total = visibleMonths.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const handleSave = async () => {
    if (!task || !task.id || !user) return;
    
    setSaving(true);
    try {
      // Prepare bulk update data
      const updates: Array<{ clientId: string; monthKey: string; isCompleted: boolean }> = [];
      
      visibleMonths.forEach(month => {
        clients.forEach(client => {
          const isCompleted = clientCompletions.get(client.id)?.has(month.key) || false;
          updates.push({
            clientId: client.id,
            monthKey: month.key,
            isCompleted,
          });
        });
      });

      // Save to Firestore
      await taskCompletionService.bulkUpdate(task.id, updates, user.uid);
      
      onClose();
    } catch (error) {
      console.error('Error saving completions:', error);
      alert('Failed to save completions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track completion for {clients.length} client{clients.length !== 1 ? 's' : ''} • {task.recurrencePattern} recurrence
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-auto max-h-[calc(90vh-180px)]">
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No clients assigned to this task</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 sticky top-0">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                          Client Name
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-200 min-w-[100px]">
                          Progress
                        </th>
                        {visibleMonths.map(month => (
                          <th 
                            key={month.key}
                            className="px-3 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-200 min-w-[80px]"
                          >
                            <div>{month.monthName}</div>
                            <div className="text-xs font-normal text-gray-500">
                              {month.fullDate.getFullYear()}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map((client, clientIndex) => {
                        const stats = getCompletionStats(client.id);
                        return (
                          <tr 
                            key={client.id}
                            className={clientIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 z-10" style={{ backgroundColor: clientIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                              <div>
                                <div className="font-semibold">{client.name}</div>
                                {client.email && (
                                  <div className="text-xs text-gray-500">{client.email}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center border-r border-gray-200">
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-sm font-semibold text-gray-900">
                                  {stats.completed}/{stats.total}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 max-w-[80px]">
                                  <div 
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${stats.percentage}%` }}
                                  />
                                </div>
                                <div className="text-xs text-gray-500">{stats.percentage}%</div>
                              </div>
                            </td>
                            {visibleMonths.map(month => (
                              <td 
                                key={month.key}
                                className="px-3 py-3 text-center"
                              >
                                <div className="flex justify-center">
                                  <input
                                    type="checkbox"
                                    checked={isCompleted(client.id, month.key)}
                                    onChange={() => toggleCompletion(client.id, month.key)}
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                    aria-label={`Mark ${client.name} as completed for ${month.label}`}
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: {clients.length} client{clients.length !== 1 ? 's' : ''} × {visibleMonths.length} month{visibleMonths.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
