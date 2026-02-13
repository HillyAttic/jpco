import { useState, useEffect, useCallback } from 'react';
import { Team, TeamMember } from '@/services/team.service';
import { TeamFormData } from '@/lib/validation';
import { auth } from '@/lib/firebase';

/**
 * Get authentication headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

interface UseTeamsFilters {
  status?: string;
  department?: string;
  search?: string;
}

interface UseTeamsReturn {
  teams: Team[];
  loading: boolean;
  error: string | null;
  filters: UseTeamsFilters;
  
  // CRUD operations
  createTeam: (data: TeamFormData) => Promise<void>;
  updateTeam: (id: string, data: Partial<TeamFormData>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  
  // Member management - Requirements 4.5, 4.6
  addMember: (teamId: string, member: TeamMember) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  updateMemberRole: (teamId: string, memberId: string, role: string) => Promise<void>;
  
  // Filter and search
  setFilters: (filters: UseTeamsFilters) => void;
  clearFilters: () => void;
  
  // Utility functions
  refreshTeams: () => Promise<void>;
  getTeamById: (id: string) => Team | undefined;
}

/**
 * Custom hook for managing teams with state management, CRUD operations,
 * member management, and optimistic updates
 * Validates Requirements: 4.5, 4.6
 */
export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<UseTeamsFilters>({
    status: 'all',
    department: 'all',
    search: '',
  });

  // Fetch teams from API
  const fetchTeams = useCallback(async (currentFilters: UseTeamsFilters = filters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.append('status', currentFilters.status);
      }
      
      if (currentFilters.department && currentFilters.department !== 'all') {
        params.append('department', currentFilters.department);
      }
      
      if (currentFilters.search && currentFilters.search.trim()) {
        params.append('search', currentFilters.search.trim());
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams?${params.toString()}`, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch teams');
      }

      setTeams(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teams';
      setError(errorMessage);
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Create team with optimistic update
  const createTeam = useCallback(async (data: TeamFormData) => {
    setError(null);
    
    // Create optimistic team
    const optimisticTeam: Team = {
      id: `temp-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      leaderId: data.leaderId,
      leaderName: '', // Will be populated by API
      memberIds: data.memberIds || [],
      members: [],
      status: data.status || 'active',
      createdAt: new Date(),
    };

    // Optimistic update
    setTeams(prev => [optimisticTeam, ...prev]);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create team');
      }

      // Replace optimistic team with real team
      setTeams(prev => prev.map(team => 
        team.id === optimisticTeam.id ? result.data : team
      ));
    } catch (err) {
      // Revert optimistic update
      setTeams(prev => prev.filter(team => team.id !== optimisticTeam.id));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Update team with optimistic update
  const updateTeam = useCallback(async (id: string, data: Partial<TeamFormData>) => {
    setError(null);
    
    // Store original team for rollback
    const originalTeam = teams.find(team => team.id === id);
    if (!originalTeam) {
      throw new Error('Team not found');
    }

    // Optimistic update
    setTeams(prev => prev.map(team => 
      team.id === id ? { ...team, ...data, updatedAt: new Date() } : team
    ));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update team');
      }

      // Update with server response
      setTeams(prev => prev.map(team => 
        team.id === id ? result.data : team
      ));
    } catch (err) {
      // Revert optimistic update
      setTeams(prev => prev.map(team => 
        team.id === id ? originalTeam : team
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update team';
      setError(errorMessage);
      throw err;
    }
  }, [teams]);

  // Delete team with optimistic update
  const deleteTeam = useCallback(async (id: string) => {
    setError(null);
    
    // Store original team for rollback
    const originalTeam = teams.find(team => team.id === id);
    if (!originalTeam) {
      throw new Error('Team not found');
    }

    // Optimistic update
    setTeams(prev => prev.filter(team => team.id !== id));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete team');
      }
    } catch (err) {
      // Revert optimistic update
      setTeams(prev => [...prev, originalTeam].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete team';
      setError(errorMessage);
      throw err;
    }
  }, [teams]);

  // Add member to team - Requirement 4.5
  const addMember = useCallback(async (teamId: string, member: TeamMember) => {
    setError(null);
    
    // Store original team for rollback
    const originalTeam = teams.find(team => team.id === teamId);
    if (!originalTeam) {
      throw new Error('Team not found');
    }

    // Optimistic update
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, members: [...team.members, member] }
        : team
    ));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify(member),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add member');
      }

      // Update with server response
      setTeams(prev => prev.map(team => 
        team.id === teamId ? result.data : team
      ));
    } catch (err) {
      // Revert optimistic update
      setTeams(prev => prev.map(team => 
        team.id === teamId ? originalTeam : team
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to add member';
      setError(errorMessage);
      throw err;
    }
  }, [teams]);

  // Remove member from team - Requirement 4.6
  const removeMember = useCallback(async (teamId: string, memberId: string) => {
    setError(null);
    
    // Store original team for rollback
    const originalTeam = teams.find(team => team.id === teamId);
    if (!originalTeam) {
      throw new Error('Team not found');
    }

    // Optimistic update
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, members: team.members.filter(member => member.id !== memberId) }
        : team
    ));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to remove member');
      }

      // Update with server response
      setTeams(prev => prev.map(team => 
        team.id === teamId ? result.data : team
      ));
    } catch (err) {
      // Revert optimistic update
      setTeams(prev => prev.map(team => 
        team.id === teamId ? originalTeam : team
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove member';
      setError(errorMessage);
      throw err;
    }
  }, [teams]);

  // Update member role - Requirements 4.5, 4.6
  const updateMemberRole = useCallback(async (teamId: string, memberId: string, role: string) => {
    setError(null);
    
    // Store original team for rollback
    const originalTeam = teams.find(team => team.id === teamId);
    if (!originalTeam) {
      throw new Error('Team not found');
    }

    // Optimistic update
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { 
            ...team, 
            members: team.members.map(member => 
              member.id === memberId ? { ...member, role } : member
            )
          }
        : team
    ));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update member role');
      }

      // Update with server response
      setTeams(prev => prev.map(team => 
        team.id === teamId ? result.data : team
      ));
    } catch (err) {
      // Revert optimistic update
      setTeams(prev => prev.map(team => 
        team.id === teamId ? originalTeam : team
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member role';
      setError(errorMessage);
      throw err;
    }
  }, [teams]);

  // Set filters and refetch
  const setFilters = useCallback((newFilters: UseTeamsFilters) => {
    setFiltersState(newFilters);
    fetchTeams(newFilters);
  }, [fetchTeams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      status: 'all',
      department: 'all',
      search: '',
    };
    setFiltersState(clearedFilters);
    fetchTeams(clearedFilters);
  }, [fetchTeams]);

  // Refresh teams
  const refreshTeams = useCallback(() => {
    return fetchTeams();
  }, [fetchTeams]);

  // Get team by ID
  const getTeamById = useCallback((id: string) => {
    return teams.find(team => team.id === id);
  }, [teams]);

  return {
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
    getTeamById,
  };
}