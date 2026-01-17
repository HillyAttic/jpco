/**
 * Shift Service
 * Handles all shift-related Firebase operations
 */

import { createFirebaseService } from './firebase.service';
import { Shift, ShiftFormData } from '@/types/attendance.types';

// Create the Firebase service instance for shifts
const shiftFirebaseService = createFirebaseService<Shift>('shifts');

/**
 * Shift Service API
 */
export const shiftService = {
  /**
   * Get all shifts
   */
  async getShifts(): Promise<Shift[]> {
    return shiftFirebaseService.getAll({
      filters: [{ field: 'isActive', operator: '==', value: true }],
      orderByField: 'name',
      orderDirection: 'asc',
    });
  },

  /**
   * Get a shift by ID
   */
  async getShift(id: string): Promise<Shift | null> {
    return shiftFirebaseService.getById(id);
  },

  /**
   * Create a new shift
   */
  async createShift(data: ShiftFormData): Promise<Shift> {
    // Check if shift name already exists
    const existing = await shiftFirebaseService.getAll({
      filters: [{ field: 'name', operator: '==', value: data.name }],
    });

    if (existing.length > 0) {
      throw new Error('Shift name already exists');
    }

    const shift: Omit<Shift, 'id'> = {
      ...data,
      isActive: true,
      assignedEmployees: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return shiftFirebaseService.create(shift);
  },

  /**
   * Update a shift
   */
  async updateShift(id: string, data: Partial<ShiftFormData>): Promise<Shift> {
    return shiftFirebaseService.update(id, data);
  },

  /**
   * Delete a shift
   */
  async deleteShift(id: string): Promise<void> {
    const shift = await shiftFirebaseService.getById(id);
    if (!shift) {
      throw new Error('Shift not found');
    }

    if (shift.assignedEmployees.length > 0) {
      throw new Error('Cannot delete shift with assigned employees');
    }

    return shiftFirebaseService.delete(id);
  },

  /**
   * Deactivate a shift
   */
  async deactivateShift(id: string): Promise<Shift> {
    return shiftFirebaseService.update(id, { isActive: false });
  },

  /**
   * Assign a shift to an employee
   */
  async assignShiftToEmployee(shiftId: string, employeeId: string): Promise<void> {
    const shift = await shiftFirebaseService.getById(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    // Check if employee is already assigned
    if (shift.assignedEmployees.includes(employeeId)) {
      throw new Error('Employee is already assigned to this shift');
    }

    // Check for overlapping shifts
    const allShifts = await this.getShifts();
    const overlappingShifts = allShifts.filter((s) => {
      if (s.id === shiftId) return false;
      if (!s.assignedEmployees.includes(employeeId)) return false;

      // Check if days overlap
      const daysOverlap = s.daysOfWeek.some((day) =>
        shift.daysOfWeek.includes(day)
      );

      if (!daysOverlap) return false;

      // Check if times overlap
      return this.checkTimeOverlap(
        shift.startTime,
        shift.endTime,
        s.startTime,
        s.endTime
      );
    });

    if (overlappingShifts.length > 0) {
      throw new Error('Employee has overlapping shift assignments');
    }

    await shiftFirebaseService.update(shiftId, {
      assignedEmployees: [...shift.assignedEmployees, employeeId],
    });
  },

  /**
   * Unassign a shift from an employee
   */
  async unassignShiftFromEmployee(
    shiftId: string,
    employeeId: string
  ): Promise<void> {
    const shift = await shiftFirebaseService.getById(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    const updatedEmployees = shift.assignedEmployees.filter(
      (id) => id !== employeeId
    );

    await shiftFirebaseService.update(shiftId, {
      assignedEmployees: updatedEmployees,
    });
  },

  /**
   * Get employee's shift for a specific date
   */
  async getEmployeeShift(employeeId: string, date: Date): Promise<Shift | null> {
    const dayOfWeek = date.getDay();
    const allShifts = await this.getShifts();

    const employeeShifts = allShifts.filter(
      (shift) =>
        shift.assignedEmployees.includes(employeeId) &&
        shift.daysOfWeek.includes(dayOfWeek)
    );

    return employeeShifts.length > 0 ? employeeShifts[0] : null;
  },

  /**
   * Get all employees assigned to a shift
   */
  async getShiftEmployees(shiftId: string): Promise<string[]> {
    const shift = await shiftFirebaseService.getById(shiftId);
    return shift?.assignedEmployees || [];
  },

  /**
   * Get all shifts for an employee
   */
  async getEmployeeShifts(employeeId: string): Promise<Shift[]> {
    const allShifts = await this.getShifts();
    return allShifts.filter((shift) =>
      shift.assignedEmployees.includes(employeeId)
    );
  },

  /**
   * Check if two time ranges overlap
   */
  private checkTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const [start1Hour, start1Min] = start1.split(':').map(Number);
    const [end1Hour, end1Min] = end1.split(':').map(Number);
    const [start2Hour, start2Min] = start2.split(':').map(Number);
    const [end2Hour, end2Min] = end2.split(':').map(Number);

    const start1Minutes = start1Hour * 60 + start1Min;
    let end1Minutes = end1Hour * 60 + end1Min;
    const start2Minutes = start2Hour * 60 + start2Min;
    let end2Minutes = end2Hour * 60 + end2Min;

    // Handle overnight shifts
    if (end1Minutes < start1Minutes) end1Minutes += 24 * 60;
    if (end2Minutes < start2Minutes) end2Minutes += 24 * 60;

    // Check for overlap
    return (
      (start1Minutes >= start2Minutes && start1Minutes < end2Minutes) ||
      (end1Minutes > start2Minutes && end1Minutes <= end2Minutes) ||
      (start1Minutes <= start2Minutes && end1Minutes >= end2Minutes)
    );
  },

  /**
   * Validate shift times
   */
  validateShiftTimes(startTime: string, endTime: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(startTime) && timeRegex.test(endTime);
  },
};
