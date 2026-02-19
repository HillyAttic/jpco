/**
 * Leave Management Service
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import { LeaveRequest, LeaveFilters, LeaveStats, LeaveStatus } from '@/types/leave.types';

const leaveFirebaseService = createFirebaseService<LeaveRequest>('leave-requests');

export const leaveService = {
  /**
   * Get all leave requests with filters
   */
  async getAll(filters?: LeaveFilters): Promise<LeaveRequest[]> {
    const options: QueryOptions = {
      filters: [],
      orderByField: 'createdAt',
      orderDirection: 'desc',
    };

    if (filters?.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    if (filters?.employeeId) {
      options.filters!.push({
        field: 'employeeId',
        operator: '==',
        value: filters.employeeId,
      });
    }

    if (filters?.leaveType) {
      options.filters!.push({
        field: 'leaveType',
        operator: '==',
        value: filters.leaveType,
      });
    }

    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    let requests = await leaveFirebaseService.getAll(options);

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      requests = requests.filter(req =>
        req.employeeName.toLowerCase().includes(searchLower) ||
        req.employeeEmail.toLowerCase().includes(searchLower) ||
        req.reason.toLowerCase().includes(searchLower)
      );
    }

    return requests;
  },

  /**
   * Get leave request by ID
   */
  async getById(id: string): Promise<LeaveRequest | null> {
    return await leaveFirebaseService.getById(id);
  },

  /**
   * Create a new leave request
   */
  async create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveRequest> {
    // Calculate total days
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = {
      ...data,
      totalDays,
      status: 'pending' as LeaveStatus,
    };

    return await leaveFirebaseService.create(leaveRequest);
  },

  /**
   * Update leave request
   */
  async update(id: string, data: Partial<LeaveRequest>): Promise<void> {
    await leaveFirebaseService.update(id, data);
  },

  /**
   * Approve leave request
   */
  async approve(id: string, approverId: string, approverName: string): Promise<void> {
    await leaveFirebaseService.update(id, {
      status: 'approved',
      approvedBy: approverId,
      approverName,
      approvedAt: new Date(),
    });
  },

  /**
   * Reject leave request
   */
  async reject(id: string, approverId: string, approverName: string, reason: string): Promise<void> {
    await leaveFirebaseService.update(id, {
      status: 'rejected',
      approvedBy: approverId,
      approverName,
      approvedAt: new Date(),
      rejectionReason: reason,
    });
  },

  /**
   * Delete leave request
   */
  async delete(id: string): Promise<void> {
    await leaveFirebaseService.delete(id);
  },

  /**
   * Get leave statistics
   */
  async getStats(filters?: LeaveFilters): Promise<LeaveStats> {
    const requests = await this.getAll(filters);

    return {
      totalRequests: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  },

  /**
   * Get employee leave requests
   */
  async getEmployeeRequests(employeeId: string): Promise<LeaveRequest[]> {
    return await this.getAll({ employeeId });
  },
};
