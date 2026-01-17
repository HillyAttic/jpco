'use client';

import React, { useState } from 'react';
import { useTeams } from '@/hooks/use-teams';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { Team } from '@/services/team.service';
import { TeamFormData } from '@/lib/validation';
import { TeamCard } from '@/components/teams/TeamCard';
import { TeamModal } from '@/components/teams/TeamModal';
import { TeamDetailPanel } from '@/components/teams/TeamDetailPanel';
import { TeamFilter, TeamFilterState } from '@/components/teams/TeamFilter';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NoResultsEmptyState, NoDataEmptyState } from '@/components/ui/empty-state';
import { CardGridSkeleton } from '@/components/ui/loading-skeletons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { exportToCSV, generateTimestampedFilename } from '@/utils/csv-export';
import {
  PlusIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/**
 * Teams Page Component
 * Main page for team management with CRUD operations, filtering, and team details
 * Validates Requirements: 4.1, 4.2, 10.1, 10.2, 10.3, 10.4
 */
export default function TeamsPage() {
  const {
    teams,
    loading,
    error,
    filters,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    removeMember,
    updateMemberRole,
    setFilters,
    clearFilters,
    refreshTeams,
  } = useTeams();

  // Bulk selection state - Requirement 10.1
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useBulkSelection(teams);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Get unique departments for filter
  const availableDepartments = Array.from(
    new Set(teams.filter(team => team.department).map(team => team.department!))
  ).sort();

  // Handle create team
  const handleCreateTeam = async (data: TeamFormData) => {
    setIsSubmitting(true);
    try {
      await createTeam(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating team:', error);
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit team
  const handleEditTeam = async (data: TeamFormData) => {
    if (!selectedTeam?.id) return;
    
    setIsSubmitting(true);
    try {
      await updateTeam(selectedTeam.id, data);
      setIsEditModalOpen(false);
      setSelectedTeam(null);
      
      // Update detail panel if it's showing the same team
      if (detailTeam?.id === selectedTeam.id) {
        const updatedTeam = teams.find(t => t.id === selectedTeam.id);
        if (updatedTeam) {
          setDetailTeam(updatedTeam);
        }
      }
    } catch (error) {
      console.error('Error updating team:', error);
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete team
  const handleDeleteTeam = async (id: string) => {
    const team = teams.find(t => t.id === id);
    if (!team) return;

    const confirmMessage = `Are you sure you want to delete "${team.name}"? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    try {
      await deleteTeam(id);
      
      // Close detail panel if showing deleted team
      if (detailTeam?.id === id) {
        setDetailTeam(null);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      // Error is handled by the hook
    }
  };

  // Handle team card edit
  const handleEditClick = (team: Team) => {
    setSelectedTeam(team);
    setIsEditModalOpen(true);
  };

  // Handle team detail view
  const handleViewDetails = (id: string) => {
    const team = teams.find(t => t.id === id);
    if (team) {
      setDetailTeam(team);
    }
  };

  // Handle team update from detail panel
  const handleTeamUpdate = (updatedTeam: Team) => {
    setDetailTeam(updatedTeam);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: TeamFilterState) => {
    setFilters({
      status: newFilters.status === 'all' ? undefined : newFilters.status,
      department: newFilters.department === 'all' ? undefined : newFilters.department,
      search: filters.search, // Preserve search
    });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    clearFilters();
  };

  // Close modals
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTeam(null);
  };

  const handleCloseDetailPanel = () => {
    setDetailTeam(null);
  };

  /**
   * Handle bulk delete
   * Validates Requirements: 10.1, 10.2
   */
  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  /**
   * Confirm bulk delete
   * Deletes all selected teams
   */
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected teams
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteTeam(id))
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting teams:', error);
      alert('Failed to delete some teams. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /**
   * Handle bulk export
   * Validates Requirements: 10.3
   */
  const handleBulkExport = () => {
    // Prepare data for export
    const exportData = selectedItems.map((team) => ({
      Name: team.name,
      Description: team.description || '',
      Leader: team.leaderName || '',
      'Member Count': team.members.length,
      Department: team.department || '',
      Status: team.status,
      'Created At': team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '',
    }));

    // Generate filename and export
    const filename = generateTimestampedFilename('teams_export');
    exportToCSV(exportData, filename);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Breadcrumbs - Requirement 4.1 */}
        <Breadcrumb pageName="Teams" />

        {/* Page Header - Requirement 4.1 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">
              Manage your organization's teams and members
            </p>
          </div>
          
          {/* Add New Team Button - Requirement 4.2 */}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <PlusIcon className="w-5 h-5" />
            Add New Team
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshTeams}
                  className="text-red-600 hover:text-red-700"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Teams</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teams.filter(team => team.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teams.reduce((total, team) => total + team.members.length + 1, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {availableDepartments.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TeamFilter
          filters={{
            status: filters.status || 'all',
            department: filters.department || 'all',
          }}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          availableDepartments={availableDepartments}
        />

        {/* Teams Grid */}
        <div className="space-y-6">
          {loading ? (
            // Loading skeleton
            <CardGridSkeleton count={6} />
          ) : teams.length === 0 ? (
            // Empty state
            filters.status !== 'all' || filters.department !== 'all' || filters.search ? (
              <NoResultsEmptyState 
                onClearFilters={() => setFilters({ status: 'all', department: 'all', search: '' })}
              />
            ) : (
              <NoDataEmptyState 
                entityName="Teams" 
                onAdd={() => setIsCreateModalOpen(true)}
              />
            )
          ) : (
            // Teams grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteTeam}
                  onViewDetails={handleViewDetails}
                  selected={isSelected(team.id!)}
                  onSelect={toggleSelection}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bulk Action Toolbar - Requirements 10.1, 10.4 */}
        {selectedCount > 0 && (
          <BulkActionToolbar
            selectedCount={selectedCount}
            totalCount={teams.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleBulkExport}
          />
        )}

        {/* Bulk Delete Confirmation Dialog - Requirement 10.2 */}
        <BulkDeleteDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          itemCount={selectedCount}
          itemType="team"
          onConfirm={handleConfirmBulkDelete}
          loading={isBulkDeleting}
        />

        {/* Create Team Modal - Requirement 4.2 */}
        <TeamModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          onSubmit={handleCreateTeam}
          isLoading={isSubmitting}
        />

        {/* Edit Team Modal - Requirement 4.2 */}
        <TeamModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSubmit={handleEditTeam}
          team={selectedTeam}
          isLoading={isSubmitting}
        />

        {/* Team Detail Panel */}
        {detailTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <TeamDetailPanel
                  team={detailTeam}
                  onTeamUpdate={handleTeamUpdate}
                  onClose={handleCloseDetailPanel}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}