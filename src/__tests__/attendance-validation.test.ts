/**
 * Attendance Validation Schema Tests
 * 
 * Tests for all attendance-related Zod validation schemas
 */

import {
  attendanceRecordSchema,
  clockInSchema,
  clockOutSchema,
  leaveRequestSchema,
  leaveTypeSchema,
  shiftSchema,
  dateRangeSchema,
  attendanceFiltersSchema,
  leaveFiltersSchema,
  reportConfigSchema,
  attendancePolicySchema,
  validateGeolocationRadius
} from '@/lib/validation';

describe('Attendance Validation Schemas', () => {
  describe('clockInSchema', () => {
    it('should validate valid clock in data', () => {
      const validData = {
        timestamp: new Date(),
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        notes: 'Starting work'
      };

      const result = clockInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate clock in without optional fields', () => {
      const validData = {
        timestamp: new Date()
      };

      const result = clockInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const invalidData = {
        timestamp: new Date(),
        location: {
          latitude: 100, // Invalid: > 90
          longitude: -74.0060
        }
      };

      const result = clockInSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const invalidData = {
        timestamp: new Date().toISOString(),
        latitude: 40.7128,
        longitude: 200, // Invalid longitude
        accuracy: 10
      };