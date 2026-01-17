/**
 * Leave Service
 * Handles all leave-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import {
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  LeaveFilters,
  LeaveRequestFormData,
  LeaveTypeFormData,
} from '@/types/attendance.types';
import { calculateDaysBetween } from '@/utils/time-calculations';
import { Timestamp } from 'firebase/firestore';

// Create Firebase service instances
const leaveRequestService = createFirebaseService<LeaveRequest>('leave-requests');
const leaveTypeService = createFirebaseService<LeaveType>('leave-types');

/**
 * Leave Service API
 */
export const leaveService = {
  // ==================== Leave Requests ====================

  /**
   * Create a new leave request
   */
  async createLeaveRequest(
    data: LeaveRequestFormData & { employeeId: string; employeeName: string }
  ): Promise<LeaveRequest> {
    // Get leave type details
    const leaveType = await this.getLeaveType(data.leaveTypeId);
    if (!leaveType) {
      throw new Error('Leave type not found');
    }

    // Calculate duration
    const duration = calculateDaysBetween(data.startDate, data.endDate);
    const adjustedDuration = data.halfDay ? duration - 0.5 : duration;

    // Check leave balance
    const balance = await this.getLeaveBalance(data.employeeId, data.leaveTypeId);
    if (balance && adjustedDuration > balance.remainingDays) {
      console.warn('Leave request exceeds available balance');
    }

    const request: Omit<LeaveRequest, 'id'> = {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      leaveTypeId: data.leaveTypeId,
      leaveTypeName: leaveType.name,
      startDate: data.startDate,
      endDate: data.endDate,
      duration: adjustedDuration,
      reason: data.reason,
      status: leaveType.requiresApproval ? 'pending' : 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return leaveRequestService.create(request);
  },

  /**
   * Update a leave request
   */
  async updateLeaveRequest(
    id: string,
    data: Partial<LeaveRequestFormData>
  ): Promise<LeaveRequest> {
    const request = await leaveRequestService.getById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only update pending leave requests');
    }

    const updates: Partial<LeaveRequest> = {};

    if (data.startDate || data.endDate) {
      const startDate = data.startDate || request.startDate;
      const endDate = data.endDate || request.endDate;
      updates.startDate = startDate;
      updates.endDate = endDate;
      updates.duration = calculateDaysBetween(startDate, endDate);
    }

    if (data.reason) {
      updates.reason = data.reason;
    }

    if (data.leaveTypeId) {
      const leaveType = await this.getLeaveType(data.leaveTypeId);
      if (!leaveType) {
        throw new Error('Leave type not found');
      }
      updates.leaveTypeId = data.leaveTypeId;
      updates.leaveTypeName = leaveType.name;
    }

    return leaveRequestService.update(id, updates);
  },

  /**
   * Cancel a leave request
   */
  async cancelLeaveRequest(id: string): Promise<void> {
    const request = await leaveRequestService.getById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status === 'approved') {
      // Restore leave balance
      await this.adjustLeaveBalance(
        request.employeeId,
        request.leaveTypeId,
        request.duration
      );
    }

    await leaveRequestService.update(id, { status: 'cancelled' });
  },

  /**
   * Get leave requests with filters
   */
  async getLeaveRequests(filters: LeaveFilters): Promise<LeaveRequest[]> {
    const options: QueryOptions = {
      filters: [],
    };

    // Add employee filter
    if (filters.employeeId) {
      options.filters!.push({
        field: 'employeeId',
        operator: '==',
        value: filters.employeeId,
      });
    }

    // Add status filter
    if (filters.status) {
      options.filters!.push({
        field: 'status',
        operator: '==',
        value: filters.status,
      });
    }

    // Add leave type filter
    if (filters.leaveTypeId) {
      options.filters!.push({
        field: 'leaveTypeId',
        operator: '==',
        value: filters.leaveTypeId,
      });
    }

    // Add date range filters
    if (filters.startDate) {
      options.filters!.push({
        field: 'startDate',
        operator: '>=',
        value: Timestamp.fromDate(filters.startDate),
      });
    }

    if (filters.endDate) {
      options.filters!.push({
        field: 'endDate',
        operator: '<=',
        value: Timestamp.fromDate(filters.endDate),
      });
    }

    // Add default ordering
    options.orderByField = 'createdAt';
    options.orderDirection = 'desc';

    return leaveRequestService.getAll(options);
  },

  /**
   * Get pending leave requests for a manager
   */
  async getPendingLeaveRequests(managerId: string): Promise<LeaveRequest[]> {
    // This would need to integrate with employee service to get team members
    // For now, return all pending requests
    return this.getLeaveRequests({ status: 'pending' });
  },

  // ==================== Leave Approval ====================

  /**
   * Approve a leave request
   */
  async approveLeaveRequest(id: string, approverId: string): Promise<LeaveRequest> {
    const request = await leaveRequestService.getById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only approve pending leave requests');
    }

    // Update leave balance
    await this.adjustLeaveBalance(
      request.employeeId,
      request.leaveTypeId,
      -request.duration
    );

    return leaveRequestService.update(id, {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
    });
  },

  /**
   * Reject a leave request
   */
  async rejectLeaveRequest(
    id: string,
    approverId: string,
    reason: string
  ): Promise<LeaveRequest> {
    const request = await leaveRequestService.getById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Can only reject pending leave requests');
    }

    return leaveRequestService.update(id, {
      status: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
    });
  },

  /**
   * Revoke an approved leave request
   */
  async revokeLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
    const request = await leaveRequestService.getById(id);
    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== 'approved') {
      throw new Error('Can only revoke approved leave requests');
    }

    // Restore leave balance
    await this.adjustLeaveBalance(
      request.employeeId,
      request.leaveTypeId,
      request.duration
    );

    return leaveRequestService.update(id, {
      status: 'cancelled',
      rejectionReason: reason,
    });
  },

  // ==================== Leave Balances ====================

  /**
   * Get leave balances for an employee
   */
  async getLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
    // In a real implementation, this would query a subcollection
    // For now, return mock data based on leave types
    const leaveTypes = await this.getLeaveTypes();
    
    return leaveTypes.map((type) => ({
      leaveTypeId: type.id!,
      leaveTypeName: type.name,
      totalDays: type.maxDaysPerYear,
      usedDays: 0,
      remainingDays: type.maxDaysPerYear,
      accrualRate: type.accrualRate,
      updatedAt: new Date(),
    }));
  },

  /**
   * Get leave balance for a specific leave type
   */
  async getLeaveBalance(
    employeeId: string,
    leaveTypeId: string
  ): Promise<LeaveBalance | null> {
    const balances = await this.getLeaveBalances(employeeId);
    return balances.find((b) => b.leaveTypeId === leaveTypeId) || null;
  },

  /**
   * Adjust leave balance
   */
  async adjustLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    adjustment: number
  ): Promise<LeaveBalance> {
    const balance = await this.getLeaveBalance(employeeId, leaveTypeId);
    if (!balance) {
      throw new Error('Leave balance not found');
    }

    const newUsedDays = balance.usedDays - adjustment;
    const newRemainingDays = balance.totalDays - newUsedDays;

    // In a real implementation, this would update the subcollection
    return {
      ...balance,
      usedDays: newUsedDays,
      remainingDays: newRemainingDays,
      updatedAt: new Date(),
    };
  },

  /**
   * Initialize leave balances for a new employee
   */
  async initializeLeaveBalances(
    employeeId: string,
    hireDate: Date
  ): Promise<LeaveBalance[]> {
    const leaveTypes = await this.getLeaveTypes();
    const balances: LeaveBalance[] = [];

    for (const type of leaveTypes) {
      // Calculate prorated balance based on hire date
      const monthsEmployed = Math.max(
        1,
        Math.floor(
          (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      );
      const proratedDays = Math.min(
        type.maxDaysPerYear,
        type.accrualRate * monthsEmployed
      );

      balances.push({
        leaveTypeId: type.id!,
        leaveTypeName: type.name,
        totalDays: proratedDays,
        usedDays: 0,
        remainingDays: proratedDays,
        accrualRate: type.accrualRate,
        lastAccrualDate: new Date(),
        updatedAt: new Date(),
      });
    }

    return balances;
  },

  // ==================== Leave Types ====================

  /**
   * Get all leave types
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    return leaveTypeService.getAll({
      filters: [{ field: 'isActive', operator: '==', value: true }],
      orderByField: 'name',
      orderDirection: 'asc',
    });
  },

  /**
   * Get a leave type by ID
   */
  async getLeaveType(id: string): Promise<LeaveType | null> {
    return leaveTypeService.getById(id);
  },

  /**
   * Create a new leave type
   */
  async createLeaveType(data: LeaveTypeFormData): Promise<LeaveType> {
    // Check if code already exists
    const existing = await leaveTypeService.getAll({
      filters: [{ field: 'code', operator: '==', value: data.code.toUpperCase() }],
    });

    if (existing.length > 0) {
      throw new Error('Leave type code already exists');
    }

    const leaveType: Omit<LeaveType, 'id'> = {
      ...data,
      code: data.code.toUpperCase(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return leaveTypeService.create(leaveType);
  },

  /**
   * Update a leave type
   */
  async updateLeaveType(
    id: string,
    data: Partial<LeaveTypeFormData>
  ): Promise<LeaveType> {
    const updates: Partial<LeaveType> = {
      ...data,
    };

    if (data.code) {
      updates.code = data.code.toUpperCase();
    }

    return leaveTypeService.update(id, updates);
  },

  /**
   * Deactivate a leave type
   */
  async deactivateLeaveType(id: string): Promise<LeaveType> {
    return leaveTypeService.update(id, { isActive: false });
  },

  /**
   * Check for overlapping leave requests
   */
  async checkLeaveOverlap(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string
  ): Promise<LeaveRequest[]> {
    const allRequests = await this.getLeaveRequests({
      employeeId,
      status: 'approved',
    });

    return allRequests.filter((request) => {
      if (excludeRequestId && request.id === excludeRequestId) {
        return false;
      }

      // Check for date overlap
      return (
        (startDate >= request.startDate && startDate <= request.endDate) ||
        (endDate >= request.startDate && endDate <= request.endDate) ||
        (startDate <= request.startDate && endDate >= request.endDate)
      );
    });
  },
};
