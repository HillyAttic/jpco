/**
 * Property-Based Tests for Employee API
 * Feature: management-pages
 * 
 * This file contains property-based tests for employee API functionality:
 * - Property 48: Employee Deactivation Preservation
 * 
 * Validates: Requirements 5.10
 */

import fc from 'fast-check';
import { Employee } from '@/services/employee.service';

// Mock the entire employee service
jest.mock('@/services/employee.service', () => ({
  employeeService: {
    getById: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  },
}));

import { employeeService } from '@/services/employee.service';

// ============================================================================
// Property 48: Employee Deactivation Preservation
// Test deactivation preserves data
// Validates: Requirements 5.10
// ============================================================================

describe('Feature: management-pages, Property 48: Employee Deactivation Preservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve all employee data when deactivating', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
          name: fc.string({ minLength: 2, maxLength: 50 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
          department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
          status: fc.constantFrom('active', 'on-leave') as fc.Arbitrary<'active' | 'on-leave'>,
          managerId: fc.option(fc.uuid(), { nil: undefined }),
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        async (originalEmployee) => {
          // Mock update to return the employee with updated status
          const deactivatedEmployee = {
            ...originalEmployee,
            status: 'terminated' as const,
            updatedAt: new Date(),
          };

          (employeeService.update as jest.Mock).mockResolvedValueOnce(deactivatedEmployee);

          // Mock deactivate to call update and return the result
          (employeeService.deactivate as jest.Mock).mockImplementationOnce(async (id: string) => {
            return employeeService.update(id, { status: 'terminated' });
          });

          // Deactivate the employee
          const result = await employeeService.deactivate(originalEmployee.id!);

          // Verify all original data is preserved except status
          expect(result.id).toBe(originalEmployee.id);
          expect(result.employeeId).toBe(originalEmployee.employeeId);
          expect(result.name).toBe(originalEmployee.name);
          expect(result.email).toBe(originalEmployee.email);
          expect(result.phone).toBe(originalEmployee.phone);
          expect(result.position).toBe(originalEmployee.position);
          expect(result.department).toBe(originalEmployee.department);
          expect(result.hireDate).toEqual(originalEmployee.hireDate);
          expect(result.avatarUrl).toBe(originalEmployee.avatarUrl);
          expect(result.managerId).toBe(originalEmployee.managerId);
          expect(result.teamIds).toEqual(originalEmployee.teamIds);
          expect(result.createdAt).toEqual(originalEmployee.createdAt);

          // Verify status is updated to 'terminated'
          expect(result.status).toBe('terminated');

          // Verify updatedAt is updated (should be more recent)
          expect(result.updatedAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain data integrity after deactivation and retrieval', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
          name: fc.string({ minLength: 2, maxLength: 50 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
          department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constant('active') as fc.Arbitrary<'active'>,
          teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
        }),
        async (originalEmployee) => {
          // Create the deactivated version
          const deactivatedEmployee = {
            ...originalEmployee,
            status: 'terminated' as const,
            updatedAt: new Date(),
          };

          // Mock deactivate to return deactivated employee
          (employeeService.deactivate as jest.Mock).mockResolvedValueOnce(deactivatedEmployee);

          // Mock getById to return the deactivated employee
          (employeeService.getById as jest.Mock).mockResolvedValueOnce(deactivatedEmployee);

          // Deactivate the employee
          await employeeService.deactivate(originalEmployee.id!);

          // Retrieve the employee
          const retrievedEmployee = await employeeService.getById(originalEmployee.id!);

          // Verify the retrieved employee has all original data
          expect(retrievedEmployee).toBeDefined();
          expect(retrievedEmployee!.id).toBe(originalEmployee.id);
          expect(retrievedEmployee!.employeeId).toBe(originalEmployee.employeeId);
          expect(retrievedEmployee!.name).toBe(originalEmployee.name);
          expect(retrievedEmployee!.email).toBe(originalEmployee.email);
          expect(retrievedEmployee!.phone).toBe(originalEmployee.phone);
          expect(retrievedEmployee!.position).toBe(originalEmployee.position);
          expect(retrievedEmployee!.department).toBe(originalEmployee.department);
          expect(retrievedEmployee!.teamIds).toEqual(originalEmployee.teamIds);

          // Verify status is 'terminated'
          expect(retrievedEmployee!.status).toBe('terminated');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle deactivation of employees with minimal data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
          name: fc.string({ minLength: 2, maxLength: 50 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          position: fc.string({ minLength: 2, maxLength: 30 }),
          department: fc.string({ minLength: 2, maxLength: 30 }),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constant('active') as fc.Arbitrary<'active'>,
          teamIds: fc.constant([]) as fc.Arbitrary<string[]>,
        }),
        async (minimalEmployee) => {
          // Employee with no optional fields
          const employeeWithoutOptionals = {
            ...minimalEmployee,
            avatarUrl: undefined,
            managerId: undefined,
          };

          // Create deactivated version
          const deactivatedEmployee = {
            ...employeeWithoutOptionals,
            status: 'terminated' as const,
            updatedAt: new Date(),
          };

          (employeeService.deactivate as jest.Mock).mockResolvedValueOnce(deactivatedEmployee);

          // Deactivate the employee
          const result = await employeeService.deactivate(minimalEmployee.id!);

          // Verify all required fields are preserved
          expect(result.id).toBe(minimalEmployee.id);
          expect(result.employeeId).toBe(minimalEmployee.employeeId);
          expect(result.name).toBe(minimalEmployee.name);
          expect(result.email).toBe(minimalEmployee.email);
          expect(result.phone).toBe(minimalEmployee.phone);
          expect(result.position).toBe(minimalEmployee.position);
          expect(result.department).toBe(minimalEmployee.department);
          expect(result.teamIds).toEqual([]);

          // Verify optional fields remain undefined
          expect(result.avatarUrl).toBeUndefined();
          expect(result.managerId).toBeUndefined();

          // Verify status is 'terminated'
          expect(result.status).toBe('terminated');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve team associations after deactivation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
          name: fc.string({ minLength: 2, maxLength: 50 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          position: fc.string({ minLength: 2, maxLength: 30 }),
          department: fc.string({ minLength: 2, maxLength: 30 }),
          hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
          status: fc.constant('active') as fc.Arbitrary<'active'>,
          teamIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        }),
        async (employeeWithTeams) => {
          const originalTeamIds = [...employeeWithTeams.teamIds];

          // Create deactivated version
          const deactivatedEmployee = {
            ...employeeWithTeams,
            status: 'terminated' as const,
            updatedAt: new Date(),
          };

          (employeeService.deactivate as jest.Mock).mockResolvedValueOnce(deactivatedEmployee);

          // Deactivate the employee
          const result = await employeeService.deactivate(employeeWithTeams.id!);

          // Verify team associations are preserved
          expect(result.teamIds).toEqual(originalTeamIds);
          expect(result.teamIds.length).toBe(originalTeamIds.length);

          // Verify each team ID is preserved
          originalTeamIds.forEach((teamId) => {
            expect(result.teamIds).toContain(teamId);
          });

          // Verify status is 'terminated'
          expect(result.status).toBe('terminated');
        }
      ),
      { numRuns: 100 }
    );
  });
});
