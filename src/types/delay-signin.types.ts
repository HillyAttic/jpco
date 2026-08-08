/**
 * Delay Sign-In Approval Types
 */

export type DelaySigninRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface DelaySigninRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  attendanceRecordId: string;
  shiftId: string;
  shiftName: string;
  shiftStartTime: string;
  clockInTime: Date;
  minutesLate: number;
  reason: string;
  status: DelaySigninRequestStatus;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  approvalReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DelaySigninFilters {
  status?: DelaySigninRequestStatus;
  employeeId?: string;
  search?: string;
  limit?: number;
}

export interface DelaySigninStats {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
}
