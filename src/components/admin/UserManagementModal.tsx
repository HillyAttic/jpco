'use client';

import React, { useState } from 'react';
import { UserProfile, UserRole } from '@/types/auth.types';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { userManagementService } from '@/services/user-management.service';
import { roleManagementService } from '@/services/role-management.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';

interface UserManagementModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (user: UserProfile) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const { user: currentUser } = useAuthEnhanced();
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    email: user.email || '',
    role: user.role,
    department: user.department || '',
    phoneNumber: user.phoneNumber || '',
    isActive: user.isActive,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError('');

    try {
      // Update user profile
      await userManagementService.updateUserProfile(
        user.uid,
        {
          displayName: formData.displayName,
          department: formData.department,
          phoneNumber: formData.phoneNumber,
          isActive: formData.isActive,
        },
        currentUser.uid
      );

      // Update role if changed
      if (formData.role !== user.role) {
        await roleManagementService.assignRole(
          user.uid,
          formData.role,
          currentUser.uid
        );
      }

      // Return updated user
      const updatedUser: UserProfile = {
        ...user,
        displayName: formData.displayName,
        role: formData.role,
        department: formData.department,
        phoneNumber: formData.phoneNumber,
        isActive: formData.isActive,
      };

      onSave(updatedUser);
    } catch (err) {
      setError('Failed to update user');
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onClose={onClose} title="Edit User">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            disabled
            className="bg-gray-100"
          />
          <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
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
        </div>

        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            placeholder="e.g., Engineering, Marketing, Sales"
          />
        </div>

        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="e.g., +1 (555) 123-4567"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="isActive">Active User</Label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};