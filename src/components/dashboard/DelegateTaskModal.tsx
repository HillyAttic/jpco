'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Select from '@/components/ui/select';
import { UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { authenticatedFetch } from '@/lib/api-client';

interface DelegateUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DelegateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'admin' | 'manager' | 'employee';
  assignedClientIds: string[];
  teamMemberMappings?: Array<{
    userId: string;
    userName: string;
    clientIds: string[];
  }>;
  onDelegated?: () => void;
}

export function DelegateTaskModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  currentUserId,
  currentUserName,
  currentUserRole,
  assignedClientIds,
  teamMemberMappings,
  onDelegated,
}: DelegateTaskModalProps) {
  const [delegateTo, setDelegateTo] = useState('');
  const [reason, setReason] = useState('');
  const [availableUsers, setAvailableUsers] = useState<DelegateUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load available users for delegation
  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        if (currentUserRole === 'manager') {
          // Managers delegate to their assigned employees from manager hierarchy
          const response = await authenticatedFetch('/api/manager-hierarchy/my-employees');
          if (response.ok) {
            const employees: DelegateUser[] = await response.json();
            // Exclude self from the list
            setAvailableUsers(employees.filter(e => e.id !== currentUserId));
          }
        } else {
          // Regular employees can only delegate to admins and managers
          const response = await authenticatedFetch('/api/recurring-tasks/delegate/available-users');
          if (response.ok) {
            const users: DelegateUser[] = await response.json();
            // Exclude self
            setAvailableUsers(users.filter(u => u.id !== currentUserId));
          }
        }
      } catch (error) {
        console.error('Error loading users for delegation:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, currentUserRole, currentUserId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDelegateTo('');
      setReason('');
    }
  }, [isOpen]);

  const handleDelegate = async () => {
    if (!delegateTo) {
      toast.error('Please select a user to delegate to');
      return;
    }

    setSaving(true);
    try {
      const selectedUser = availableUsers.find(u => u.id === delegateTo);

      const response = await authenticatedFetch('/api/recurring-tasks/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          delegateToUserId: delegateTo,
          delegateToUserName: selectedUser?.name || '',
          delegatedByUserId: currentUserId,
          delegatedByUserName: currentUserName,
          reason,
          clientIds: assignedClientIds,
        }),
      });

      if (response.ok) {
        toast.success(`Task delegated to ${selectedUser?.name || 'user'} successfully!`);
        onDelegated?.();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to delegate task');
      }
    } catch (error) {
      console.error('Error delegating task:', error);
      toast.error('Failed to delegate task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightIcon className="w-5 h-5 text-orange-600" />
            Delegate Task
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Delegate &quot;{taskTitle}&quot; to another team member
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Assignment Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Currently assigned to:</strong> {currentUserName}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {assignedClientIds.length} client{assignedClientIds.length !== 1 ? 's' : ''} assigned
            </p>
          </div>

          {/* Delegate To */}
          <div>
            <Label htmlFor="delegateTo" className="mb-2 block">
              Delegate To <span className="text-red-500">*</span>
            </Label>
            {loading ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                Loading available users...
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No users available for delegation</p>
                <p className="text-xs mt-1">
                  {currentUserRole === 'manager'
                    ? 'No employees assigned under you in the manager hierarchy'
                    : 'No admins or managers available'
                  }
                </p>
              </div>
            ) : (
              <Select
                id="delegateTo"
                value={delegateTo}
                onChange={(e) => setDelegateTo(e.target.value)}
                className="w-full"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role}) - {user.email}
                  </option>
                ))}
              </Select>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {currentUserRole === 'manager'
                ? 'You can delegate to employees assigned under you'
                : 'You can delegate to admins and managers only'
              }
            </p>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="mb-2 block">
              Reason (Optional)
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., On leave, Emergency, etc."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
              rows={3}
            />
          </div>

          {/* Info Note */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> The delegated user will see this task on their dashboard with the assigned clients. They can plan or further delegate the task.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelegate}
            disabled={!delegateTo || saving || loading}
            loading={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? 'Delegating...' : 'Delegate Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
