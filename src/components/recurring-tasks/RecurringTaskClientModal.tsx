'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
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
  arnData?: Map<string, { arnNumber: string; arnName: string }>; // ARN data per month
}

interface RecurringTaskClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: RecurringTask | null;
  clients: Client[];
  viewingMonth?: Date; // The month being viewed in the calendar
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
  viewingMonth,
}: RecurringTaskClientModalProps) {
  const [clientCompletions, setClientCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [arnData, setArnData] = useState<Map<string, Map<string, { arnNumber: string; arnName: string }>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showArnDialog, setShowArnDialog] = useState(false);
  const [currentArnRequest, setCurrentArnRequest] = useState<{ clientId: string; monthKey: string } | null>(null);
  const [arnNumber, setArnNumber] = useState('');
  const [arnName, setArnName] = useState('');
  const [arnError, setArnError] = useState('');
  const { user, userProfile } = useEnhancedAuth();

  // Generate only the viewing month (or current month if not specified)
  const generateMonths = () => {
    const targetDate = viewingMonth || new Date();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    const date = new Date(targetYear, targetMonth, 1);
    return [{
      key: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      monthName: date.toLocaleDateString('en-US', { month: 'short' }),
      year: targetYear.toString(),
      fullDate: date,
    }];
  };

  // Filter months based on recurrence pattern - always show only viewing month
  const getVisibleMonths = () => {
    return generateMonths(); // Always return viewing month only
  };

  const visibleMonths = getVisibleMonths();

  // Initialize client completions from task data
  useEffect(() => {
    if (task && isOpen && task.id) {
      console.log('[ARN Debug] Task loaded in modal:', {
        taskId: task.id,
        taskTitle: task.title,
        requiresArn: task.requiresArn,
        fullTask: task
      });
      loadCompletions();
    }
  }, [task, clients, isOpen, viewingMonth]);

  // Filter clients based on team member mappings
  const getFilteredClients = (): Client[] => {
    if (!task || !user) return clients;
    
    // Check if task has team member mappings
    if (task.teamMemberMappings && task.teamMemberMappings.length > 0) {
      // Find the mapping for current user
      const userMapping = task.teamMemberMappings.find(mapping => mapping.userId === user.uid);
      
      if (userMapping) {
        // Filter clients to only show those assigned to this user
        const filteredClients = clients.filter(client => 
          client.id && userMapping.clientIds.includes(client.id)
        );
        
        console.log('[Team Member Mapping] Filtered clients for user:', {
          userId: user.uid,
          totalClients: clients.length,
          assignedClients: filteredClients.length,
          clientIds: userMapping.clientIds
        });
        
        return filteredClients;
      }
    }
    
    // No team member mappings or user not in mappings - show all clients
    return clients;
  };

  const filteredClients = getFilteredClients();

  const loadCompletions = async () => {
    if (!task || !task.id) return;
    
    setLoading(true);
    try {
      const completions = new Map<string, Set<string>>();
      const arnDataMap = new Map<string, Map<string, { arnNumber: string; arnName: string }>>();
      
      // Get filtered clients
      const clientsToLoad = getFilteredClients();
      
      // Initialize all filtered clients with empty sets
      clientsToLoad.forEach(client => {
        completions.set(client.id, new Set());
        arnDataMap.set(client.id, new Map());
      });

      // Load completion data from Firestore
      const taskCompletions = await taskCompletionService.getByTaskId(task.id);
      
      taskCompletions.forEach(completion => {
        if (completion.isCompleted) {
          const clientMonths = completions.get(completion.clientId) || new Set<string>();
          clientMonths.add(completion.monthKey);
          completions.set(completion.clientId, clientMonths);
          
          // Store ARN data if available
          if (completion.arnNumber && completion.arnName) {
            const clientArnData = arnDataMap.get(completion.clientId) || new Map();
            clientArnData.set(completion.monthKey, {
              arnNumber: completion.arnNumber,
              arnName: completion.arnName,
            });
            arnDataMap.set(completion.clientId, clientArnData);
          }
        }
      });
      
      setClientCompletions(completions);
      setArnData(arnDataMap);
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = (clientId: string, monthKey: string) => {
    const isCurrentlyCompleted = clientCompletions.get(clientId)?.has(monthKey) || false;
    
    console.log('[ARN Debug] Toggle completion:', {
      clientId,
      monthKey,
      isCurrentlyCompleted,
      taskRequiresArn: task?.requiresArn,
      shouldShowDialog: task?.requiresArn && !isCurrentlyCompleted
    });
    
    // If task requires ARN and we're checking (not unchecking), show ARN dialog
    if (task?.requiresArn && !isCurrentlyCompleted) {
      console.log('[ARN Debug] Showing ARN dialog');
      setCurrentArnRequest({ clientId, monthKey });
      setArnNumber('');
      // Use displayName from userProfile, fallback to user displayName, then email
      const userName = userProfile?.displayName || user?.displayName || user?.email || '';
      console.log('[ARN Debug] User info:', { 
        profileDisplayName: userProfile?.displayName, 
        userDisplayName: user?.displayName, 
        email: user?.email, 
        userName 
      });
      setArnName(userName);
      setArnError('');
      setShowArnDialog(true);
      return;
    }
    
    console.log('[ARN Debug] Toggling without ARN dialog');
    
    // Otherwise, toggle normally
    setClientCompletions(prev => {
      const newMap = new Map(prev);
      const clientMonths = new Set<string>(newMap.get(clientId) || new Set<string>());
      
      if (clientMonths.has(monthKey)) {
        clientMonths.delete(monthKey);
        // Remove ARN data
        setArnData(prevArn => {
          const newArnMap = new Map(prevArn);
          const clientArnData = new Map(newArnMap.get(clientId));
          clientArnData.delete(monthKey);
          newArnMap.set(clientId, clientArnData);
          return newArnMap;
        });
      } else {
        clientMonths.add(monthKey);
      }
      
      newMap.set(clientId, clientMonths);
      return newMap;
    });
  };

  const handleArnSubmit = () => {
    // Validate ARN number (15 digits)
    if (!arnNumber || arnNumber.length !== 15 || !/^\d{15}$/.test(arnNumber)) {
      setArnError('ARN must be exactly 15 digits');
      return;
    }
    
    if (!arnName || arnName.trim().length === 0) {
      setArnError('Name is required');
      return;
    }
    
    if (!currentArnRequest) return;
    
    const { clientId, monthKey } = currentArnRequest;
    
    // Add completion
    setClientCompletions(prev => {
      const newMap = new Map(prev);
      const clientMonths = new Set<string>(newMap.get(clientId) || new Set<string>());
      clientMonths.add(monthKey);
      newMap.set(clientId, clientMonths);
      return newMap;
    });
    
    // Store ARN data
    setArnData(prev => {
      const newMap = new Map(prev);
      const clientArnData = new Map(newMap.get(clientId) || new Map());
      clientArnData.set(monthKey, { arnNumber, arnName: arnName.trim() });
      newMap.set(clientId, clientArnData);
      return newMap;
    });
    
    // Close dialog
    setShowArnDialog(false);
    setCurrentArnRequest(null);
    setArnNumber('');
    setArnName('');
    setArnError('');
  };

  const handleArnCancel = () => {
    setShowArnDialog(false);
    setCurrentArnRequest(null);
    setArnNumber('');
    setArnName('');
    setArnError('');
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
    if (!task || !task.id || !user) {
      console.error('Cannot save: missing task, task.id, or user', { task: task?.id, user: user?.uid });
      return;
    }
    
    setSaving(true);
    try {
      // Prepare bulk update data
      const updates: Array<{ 
        clientId: string; 
        monthKey: string; 
        isCompleted: boolean;
        arnNumber?: string;
        arnName?: string;
      }> = [];
      
      visibleMonths.forEach(month => {
        filteredClients.forEach(client => {
          const isCompleted = clientCompletions.get(client.id)?.has(month.key) || false;
          const clientArnData = arnData.get(client.id);
          const monthArnData = clientArnData?.get(month.key);
          
          updates.push({
            clientId: client.id,
            monthKey: month.key,
            isCompleted,
            arnNumber: monthArnData?.arnNumber,
            arnName: monthArnData?.arnName,
          });
        });
      });

      console.log('Saving completions:', {
        taskId: task.id,
        totalUpdates: updates.length,
        completedCount: updates.filter(u => u.isCompleted).length,
        withArnCount: updates.filter(u => u.arnNumber).length,
        userId: user.uid
      });

      // Save to Firestore
      await taskCompletionService.bulkUpdate(task.id, updates, user.uid);
      
      console.log('Completions saved successfully');
      
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
                Track completion for {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} • {visibleMonths[0]?.label || 'Current month'} only
              </p>
              {task.teamMemberMappings && task.teamMemberMappings.length > 0 && filteredClients.length < clients.length && (
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <UserGroupIcon className="w-3 h-3" />
                  Showing only your assigned clients
                </p>
              )}
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
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {task.teamMemberMappings && task.teamMemberMappings.length > 0
                      ? 'No clients assigned to you for this task'
                      : 'No clients assigned to this task'}
                  </p>
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
                      {filteredClients.map((client, clientIndex) => {
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
              Total: {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} × {visibleMonths.length} month{visibleMonths.length !== 1 ? 's' : ''}
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

      {/* ARN Dialog */}
      {showArnDialog && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleArnCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ARN Required
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                This task requires an Application Reference Number (ARN) to mark as complete.
              </p>

              <div className="space-y-4">
                {/* ARN Number Input */}
                <div>
                  <label htmlFor="arn-number" className="block text-sm font-medium text-gray-700 mb-1">
                    ARN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="arn-number"
                    type="text"
                    value={arnNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setArnNumber(value);
                      setArnError('');
                    }}
                    placeholder="Enter 15-digit ARN"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {arnNumber.length}/15 digits
                  </p>
                </div>

                {/* Name Input - Read Only */}
                <div>
                  <label htmlFor="arn-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="arn-name"
                    type="text"
                    value={arnName}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Name is automatically filled from your profile
                  </p>
                </div>

                {/* Error Message */}
                {arnError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                    {arnError}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleArnCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArnSubmit}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
