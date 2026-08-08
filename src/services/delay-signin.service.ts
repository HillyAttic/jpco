/**
 * Delay Sign-In Request Service
 */

import { authenticatedFetch } from '@/lib/api-client';
import { DelaySigninRequest, DelaySigninFilters } from '@/types/delay-signin.types';

export const delaySigninService = {
  /**
   * Get all delay sign-in requests with filters
   */
  async getAll(filters?: DelaySigninFilters): Promise<DelaySigninRequest[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.set('status', filters.status);
    if (filters?.employeeId) params.set('employeeId', filters.employeeId);

    const queryString = params.toString();
    const url = `/api/delay-signin-requests${queryString ? `?${queryString}` : ''}`;

    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch delay sign-in requests');
    }

    return response.json();
  },

  /**
   * Get a single delay sign-in request by ID
   */
  async getById(id: string): Promise<DelaySigninRequest | null> {
    const response = await authenticatedFetch(`/api/delay-signin-requests/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch delay sign-in request');
    }

    return response.json();
  },

  /**
   * Create a new delay sign-in request
   */
  async create(data: {
    attendanceRecordId: string;
    shiftId: string;
    shiftName: string;
    shiftStartTime: string;
    reason: string;
  }): Promise<DelaySigninRequest> {
    const response = await authenticatedFetch('/api/delay-signin-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create delay sign-in request');
    }

    return response.json();
  },

  /**
   * Approve a delay sign-in request
   */
  async approveRequest(id: string, approvalReason?: string): Promise<void> {
    const response = await authenticatedFetch(`/api/delay-signin-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', approvalReason }),
    });

    if (!response.ok) {
      throw new Error('Failed to approve delay sign-in request');
    }
  },

  /**
   * Reject a delay sign-in request
   */
  async rejectRequest(id: string, reason: string): Promise<void> {
    const response = await authenticatedFetch(`/api/delay-signin-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to reject delay sign-in request');
    }
  },

  /**
   * Delete a delay sign-in request
   */
  async deleteRequest(id: string): Promise<void> {
    const response = await authenticatedFetch(`/api/delay-signin-requests/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete delay sign-in request');
    }
  },

  /**
   * Get monthly count of delay sign-in requests for an employee
   */
  async getMonthlyCount(employeeId?: string, month?: string): Promise<{
    count: number;
    maxMonthly: number;
    remaining: number;
    month: string;
  }> {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId);
    if (month) params.set('month', month);

    const queryString = params.toString();
    const url = `/api/delay-signin-requests/count${queryString ? `?${queryString}` : ''}`;

    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch monthly count');
    }

    return response.json();
  },
};
