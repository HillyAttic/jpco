'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types/auth.types';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { userManagementService } from '@/services/user-management.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: () => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  onClose,
  onInvite,
}) => {
  const { user: currentUser } = useAuthEnhanced();
  const [formData, setFormData] = useState({
    email: '',
    role: 'employee' as UserRole,
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await userManagementService.sendInvitation(
        formData.email,
        formData.role,
        currentUser.uid,
        formData.department || undefined
      );

      setSuccess('Invitation sent successfully!');
      setTimeout(() => {
        onInvite();
      }, 1500);
    } catch (err) {
      setError('Failed to send invitation');
      console.error('Error sending invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onClose={onClose} title="Invite New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="user@example.com"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            An invitation email will be sent to this address
          </p>
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => handleInputChange('role', value as UserRole)}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
          <p className="text-sm text-gray-500 mt-1">
            The user will be assigned this role upon account creation
          </p>
        </div>

        <div>
          <Label htmlFor="department">Department (Optional)</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            placeholder="e.g., Engineering, Marketing, Sales"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <p className="text-sm">
            <strong>Note:</strong> The invited user will receive a password reset email 
            that they can use to set up their account. They will need to create a password 
            and verify their email address.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !!success}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};