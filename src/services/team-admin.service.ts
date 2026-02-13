/**
 * Team Admin Service
 * Server-side service using Firebase Admin SDK for team operations
 */

import { createAdminService } from './admin-base.service';
import { adminDb } from '@/lib/firebase-admin';

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: 'leader' | 'member';
  joinedAt: Date;
}

export interface Team {
  id?: string;
  name: string;
  description?: string;
  leaderId?: string;
  members: TeamMember[];
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
   * Get all teams with search filter
   */
  async getAll(filters?: {
    search?: string;
    limit?: number;
  }): Promise<Team[]> {
    const options: any = {};

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
   * Add member to team
   */
  async addMember(teamId: string, member: TeamMember): Promise<Team> {
    const team = await baseService.getById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if member already exists
    const existingMember = team.members.find((m) => m.userId === member.userId);
    if (existingMember) {
      throw new Error('Member already exists in team');
    }

    const updatedMembers = [...team.members, member];

    return await baseService.update(teamId, {
      members: updatedMembers,
    });
  },

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, userId: string): Promise<Team> {
    const team = await baseService.getById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.filter((m) => m.userId !== userId);

    return await baseService.update(teamId, {
      members: updatedMembers,
    });
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    role: 'leader' | 'member'
  ): Promise<Team> {
    const team = await baseService.getById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const updatedMembers = team.members.map((m) =>
      m.userId === userId ? { ...m, role } : m
    );

    return await baseService.update(teamId, {
      members: updatedMembers,
    });
  },
};
