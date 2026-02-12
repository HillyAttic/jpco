import React, { useState, useEffect } from 'react';
import { Team, TeamMember, teamService } from '@/services/team.service';
import { Employee, employeeService } from '@/services/employee.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Select from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  UserGroupIcon,
  UserIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface TeamDetailPanelProps {
  team: Team;
  onTeamUpdate?: (updatedTeam: Team) => void;
  onClose?: () => void;
}

/**
 * TeamDetailPanel Component
 * Displays full team information including complete member list with roles
 * and provides member management actions (add/remove members, update roles)
 * Validates Requirements: 4.4, 4.5, 4.6
 */
export function TeamDetailPanel({ team, onTeamUpdate, onClose }: TeamDetailPanelProps) {
  const [currentTeam, setCurrentTeam] = useState<Team>(team);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberRole, setNewMemberRole] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'success' | 'default' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  // Load employees for member addition
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const activeEmployees = await employeeService.getAll({ status: 'active' });
        setEmployees(activeEmployees);
      } catch (error) {
        console.error('Error loading employees:', error);
        setError('Failed to load employees');
      }
    };

    loadEmployees();
  }, []);

  // Get available employees (not already in team and not the leader)
  const getAvailableEmployees = () => {
    return employees.filter(emp => 
      !currentTeam.members.some(member => member.id === emp.id) &&
      emp.id !== currentTeam.leaderId
    );
  };

  // Handle adding a member - Requirement 4.5
  const handleAddMember = async () => {
    if (!selectedEmployeeId) {
      setError('Please select an employee');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
      if (!selectedEmployee) {
        throw new Error('Selected employee not found');
      }

      const newMember: TeamMember = {
        id: selectedEmployee.id!,
        name: selectedEmployee.name,
        avatar: undefined, // Avatar removed from Employee interface
        role: selectedEmployee.role, // Use employee's role instead of custom role
      };

      const updatedTeam = await teamService.addMember(currentTeam.id!, newMember);
      setCurrentTeam(updatedTeam);
      onTeamUpdate?.(updatedTeam);

      // Reset form and close modal
      setSelectedEmployeeId('');
      setNewMemberRole('');
      setIsAddMemberModalOpen(false);
    } catch (error) {
      console.error('Error adding member:', error);
      setError(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a member - Requirement 4.6
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedTeam = await teamService.removeMember(currentTeam.id!, memberId);
      setCurrentTeam(updatedTeam);
      onTeamUpdate?.(updatedTeam);
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  // Get leader information
  const getLeaderInfo = () => {
    const leader = employees.find(emp => emp.id === currentTeam.leaderId);
    return leader || { name: currentTeam.leaderName };
  };

  const leaderInfo = getLeaderInfo();

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-700"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Team Overview - Requirement 4.4 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl">{currentTeam.name}</CardTitle>
            <Badge variant={getStatusVariant(currentTeam.status)}>
              {currentTeam.status}
            </Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XMarkIcon className="w-5 h-5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          {currentTeam.description && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{currentTeam.description}</p>
            </div>
          )}

          {/* Team Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Member Count */}
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Team Size</h4>
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {currentTeam.members.length + 1} {currentTeam.members.length === 0 ? 'member' : 'members'}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">(including leader)</span>
                </span>
              </div>
            </div>

            {/* Created Date */}
            {currentTeam.createdAt && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Created</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(currentTeam.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Leader */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="w-4 h-4" />
            Team Leader
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Avatar
              alt={leaderInfo.name}
              fallback={getInitials(leaderInfo.name || 'Unknown')}
              size="sm"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{leaderInfo.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Team Leader</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members - Requirement 4.4 (complete member list with roles) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserGroupIcon className="w-4 h-4" />
            Team Members ({currentTeam.members.length})
          </CardTitle>
          {/* Add Member Button - Requirement 4.5 */}
          <Button
            onClick={() => setIsAddMemberModalOpen(true)}
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {currentTeam.members.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No team members yet</p>
              <p className="text-sm">Add members to build your team</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentTeam.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={member.avatar}
                      alt={member.name}
                      fallback={getInitials(member.name)}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{member.role}</p>
                    </div>
                  </div>
                  
                  {/* Member Actions - Requirements 4.5, 4.6 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Remove member"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Modal - Requirement 4.5 */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Employee Selection */}
            <div>
              <Label htmlFor="employee">Select Employee</Label>
              <Select
                id="employee"
                value={selectedEmployeeId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedEmployeeId(e.target.value)}
                disabled={loading}
                className="mt-1"
              >
                <option value="">Choose an employee...</option>
                {getAvailableEmployees().map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.role}
                  </option>
                ))}
              </Select>
              {getAvailableEmployees().length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  No available employees to add
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddMemberModalOpen(false);
                setSelectedEmployeeId('');
                setNewMemberRole('');
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={loading || !selectedEmployeeId}
              loading={loading}
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}