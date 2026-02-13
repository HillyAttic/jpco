/**
 * Team Admin Service
 * Server-side service using Firebase Admin SDK for team operations
 */

import { createAdminService } from './admin-base.service';
import { adminDb } from '@/lib/firebase-admin';

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface Team {
  id?: string;
  name: string;
  description: string;
  leaderId?: string;
  leaderName?: string;
  memberIds: string[];
  members: TeamMember[];
  status: 'active' | 'inactive' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

// Create base admin service
const baseService = createAdminService<Team>('teams');

/**
 * Team Admin Service - Server-side only
 */
export const teamAdminService = {
  ...baseService,

  /**
   * Get all teams with optional filters
   */
  async getAll(filters?: {
    status?: string;
    department?: string;
    search?: string;
    limit?: number;
  }): Promise<Team[]> {
    const options: any = {
      filters: [],
    };

    // Add status filter
    if (filters?.status) {
      options.filters.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add department filter
    if (filters?.department) {
      options.filters.push({
        field: 'department',
        operator: '==',
        value: filters.department,
      });
    }

    // Add limit
    if (filters?.limit) {
      options.limit = filters.limit;
    }

    // Add default ordering
    options.orderBy = {
      field: 'createdAt',
      direction: 'desc' as const,
    };

    let teams = await baseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      teams = teams.filter(
        (team) =>
          team.name.toLowerCase().includes(searchLower) ||
          team.description?.toLowerCase().includes(searchLower)
      );
    }

    return teams;
  },

  /**
   * Add a member to a team
   */
  async addMember(id: string, member: TeamMember): Promise<Team> {
    const team = await baseService.getById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if member already exists
    const memberExists = team.members.some((m) => m.id === member.id);
    if (memberExists) {
      throw new Error('Member already exists in team');
    }

    const updatedMembers = [...team.members, member];
    const updatedMemberIds = [...team.memberIds, member.id];
    
    return await baseService.update(id, { 
      members: updatedMembers,
      memberIds: updatedMemberIds,
    });
  },

  /**
   * Remove a member from a team
   */
  async removeMember(id: string, memberId: string): Promise<Team> {
    const team = await baseService.getById(id);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.filter((m) => m.id !== memberId);
    const updatedMemberIds = team.memberIds.filter((id) => id !== memberId);
    
    return await baseService.update(id, { 
      members: updatedMembers,
      memberIds: updatedMemberIds,
    });
  },

  /**
   * Update a team member's role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: string
  ): Promise<Team> {
    const team = await baseService.getById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );

    return await baseService.update(teamId, { members: updatedMembers });
  },

  /**
   * Get teams by member ID
   */
  async getTeamsByMember(memberId: string): Promise<Team[]> {
    const allTeams = await baseService.getAll();
    console.log(`[Team Admin Service] Getting teams for member: ${memberId}`);
    console.log(`[Team Admin Service] Total teams in database: ${allTeams.length}`);
    
    const memberTeams = allTeams.filter((team) => {
      // Check if member is in the members array (by id)
      const isMember = team.members.some((m) => m.id === memberId);
      // Check if member is the leader
      const isLeader = team.leaderId === memberId;
      // Check if member is in memberIds array
      const isInMemberIds = team.memberIds && team.memberIds.includes(memberId);
      
      console.log(`[Team Admin Service] Team "${team.name}" (${team.id}):`, {
        members: team.members.map(m => ({ id: m.id, name: m.name })),
        memberIds: team.memberIds,
        leaderId: team.leaderId,
        isMember,
        isLeader,
        isInMemberIds,
        willInclude: isMember || isLeader || isInMemberIds
      });
      
      return isMember || isLeader || isInMemberIds;
    });
    
    console.log(`[Team Admin Service] Member ${memberId} is in ${memberTeams.length} teams`);
    return memberTeams;
  },

  /**
   * Get teams by leader ID
   */
  async getTeamsByLeader(leaderId: string): Promise<Team[]> {
    return await baseService.getAll({
      filters: [
        {
          field: 'leaderId',
          operator: '==',
          value: leaderId,
        },
      ],
    });
  },

  /**
   * Get team member count
   */
  getMemberCount(team: Team): number {
    return team.members.length;
  },
};
