'use client';

import React, { useState, useEffect } from 'react';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { userManagementService, UserStats } from '@/services/user-management.service';
import { roleManagementService } from '@/services/role-management.service';
import { UserProfile, UserRole } from '@/types/auth.types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <UserManagementContent />
    </AdminRoute>
  );
}

const UserManagementContent: React.FC = () => {
  const { user: currentUser } = useAuthEnhanced();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Load users and stats
  useEffect(() => {
    loadData();
  }, [roleFilter, departmentFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users with filters
      const filters: any = {};
      if (roleFilter !== 'all') filters.role = roleFilter;
      if (departmentFilter !== 'all') filters.department = departmentFilter;
      if (searchTerm) filters.searchTerm = searchTerm;

      const [usersResult, statsResult] = await Promise.all([
        userManagementService.getAllUsers(filters),
        userManagementService.getUserStats(),
      ]);

      setUsers(usersResult.users);
      setStats(statsResult);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      try {
        const searchResults = await userManagementService.searchUsers(searchTerm);
        setUsers(searchResults);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    } else {
      loadData();
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !currentUser) return;

    try {
      await userManagementService.deleteUser(userToDelete.uid, currentUser.uid);
      setUsers(users.filter(u => u.uid !== userToDelete.uid));
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!currentUser) return;

    try {
      await roleManagementService.assignRole(userId, newRole, currentUser.uid);
      setUsers(users.map(user => 
        user.uid === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    if (!currentUser) return;

    try {
      if (isActive) {
        await roleManagementService.activateUser(userId, currentUser.uid);
      } else {
        await roleManagementService.deactivateUser(userId, currentUser.uid);
      }
      
      setUsers(users.map(user => 
        user.uid === userId ? { ...user, isActive } : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          Invite User
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.adminUsers}</div>
            <div className="text-sm text-gray-600">Admins</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.managerUsers}</div>
            <div className="text-sm text-gray-600">Managers</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.employeeUsers}</div>
            <div className="text-sm text-gray-600">Employees</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </Select>
          <Button onClick={handleSearch} variant="outline">
            Search
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(user.uid, !user.isActive)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    {user.uid !== currentUser?.uid && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUserToDelete(user)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      {showUserModal && selectedUser && (
        <UserManagementModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onSave={(updatedUser) => {
            setUsers(users.map(u => u.uid === updatedUser.uid ? updatedUser : u));
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={() => {
            setShowInviteModal(false);
            loadData(); // Refresh data
          }}
        />
      )}

      {userToDelete && (
        <ConfirmDialog
          title="Delete User"
          message={`Are you sure you want to delete ${userToDelete.displayName}? This action cannot be undone.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setUserToDelete(null)}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};