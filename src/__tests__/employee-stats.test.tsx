/**
 * Property-Based Tests for EmployeeStatsCard
 * Feature: management-pages
 * 
 * This file contains property-based tests for employee statistics:
 * - Property 47: Employee Statistics Accuracy
 * 
 * Validates: Requirements 5.9
 */

import fc from 'fast-check';
import { Employee } from '@/services/employee.service';

/**
 * Helper function to calculate employee statistics
 * Mirrors the logic in EmployeeStatsCard component
 */
function calculateEmployeeStatistics(employees: Employee[]) {
  const totalEmployees = employees.length;
  
  const activeEmployees = employees.filter(
    employee => employee.status === 'active'
  ).length;
  
  const onLeaveEmployees = employees.filter(
    employee => employee.status === 'on-leave'
  ).length;
  
  const terminatedEmployees = employees.filter(
    employee => employee.status === 'terminated'
  ).length;

  // Calculate department distribution
  const departmentDistribution: Record<string, number> = {};
  employees.forEach(employee => {
    if (employee.department) {
      departmentDistribution[employee.department] = 
        (departmentDistribution[employee.department] || 0) + 1;
    }
  });

  // Sort departments by count (descending)
  const sortedDepartments = Object.entries(departmentDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Show top 5 departments

  // Calculate active employee rate
  const activeEmployeeRate = totalEmployees > 0 
    ? Math.round((activeEmployees / totalEmployees) * 100)
    : 0;

  return {
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    terminatedEmployees,
    departmentDistribution,
    sortedDepartments,
    activeEmployeeRate,
  };
}

// ============================================================================
// Property 47: Employee Statistics Accuracy
// Test statistics calculated correctly
// Validates: Requirements 5.9
// ============================================================================

describe('Feature: management-pages, Property 47: Employee Statistics Accuracy', () => {
  it('should calculate total employees correctly for any employee list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Total should equal the length of the array
          expect(stats.totalEmployees).toBe(employees.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate active employees correctly for any employee list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Count active employees manually
          const expectedActive = employees.filter(emp => emp.status === 'active').length;

          // Active count should match
          expect(stats.activeEmployees).toBe(expectedActive);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate on-leave employees correctly for any employee list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Count on-leave employees manually
          const expectedOnLeave = employees.filter(emp => emp.status === 'on-leave').length;

          // On-leave count should match
          expect(stats.onLeaveEmployees).toBe(expectedOnLeave);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate terminated employees correctly for any employee list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Count terminated employees manually
          const expectedTerminated = employees.filter(emp => emp.status === 'terminated').length;

          // Terminated count should match
          expect(stats.terminatedEmployees).toBe(expectedTerminated);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure status counts sum to total employees', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Sum of all status counts should equal total
          const statusSum = stats.activeEmployees + stats.onLeaveEmployees + stats.terminatedEmployees;
          expect(statusSum).toBe(stats.totalEmployees);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate department distribution correctly for any employee list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Manually calculate department distribution
          const expectedDistribution: Record<string, number> = {};
          employees.forEach(emp => {
            if (emp.department) {
              expectedDistribution[emp.department] = 
                (expectedDistribution[emp.department] || 0) + 1;
            }
          });

          // Department distribution should match
          expect(stats.departmentDistribution).toEqual(expectedDistribution);

          // Sum of department counts should equal total employees
          const departmentSum = Object.values(stats.departmentDistribution).reduce((a, b) => a + b, 0);
          expect(departmentSum).toBe(stats.totalEmployees);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort departments by count in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Verify sorted departments are in descending order
          for (let i = 0; i < stats.sortedDepartments.length - 1; i++) {
            const currentCount = stats.sortedDepartments[i][1];
            const nextCount = stats.sortedDepartments[i + 1][1];
            expect(currentCount).toBeGreaterThanOrEqual(nextCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should limit sorted departments to top 5', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Product', 'Legal'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Sorted departments should have at most 5 entries
          expect(stats.sortedDepartments.length).toBeLessThanOrEqual(5);

          // Should not exceed the number of unique departments
          const uniqueDepartments = new Set(employees.map(emp => emp.department)).size;
          expect(stats.sortedDepartments.length).toBeLessThanOrEqual(uniqueDepartments);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate active employee rate correctly for any employee list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Calculate expected rate
          const expectedRate = Math.round((stats.activeEmployees / stats.totalEmployees) * 100);

          // Active employee rate should match
          expect(stats.activeEmployeeRate).toBe(expectedRate);

          // Rate should be between 0 and 100
          expect(stats.activeEmployeeRate).toBeGreaterThanOrEqual(0);
          expect(stats.activeEmployeeRate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty employee list correctly', () => {
    const stats = calculateEmployeeStatistics([]);

    expect(stats.totalEmployees).toBe(0);
    expect(stats.activeEmployees).toBe(0);
    expect(stats.onLeaveEmployees).toBe(0);
    expect(stats.terminatedEmployees).toBe(0);
    expect(stats.departmentDistribution).toEqual({});
    expect(stats.sortedDepartments).toEqual([]);
    expect(stats.activeEmployeeRate).toBe(0);
  });

  it('should handle all employees with same status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
        fc.integer({ min: 1, max: 50 }),
        (status, count) => {
          // Create employees all with the same status
          const employees: Employee[] = Array.from({ length: count }, (_, i) => ({
            id: `emp-${i}`,
            employeeId: `EMP-${i}`,
            name: `Employee ${i}`,
            email: `emp${i}@example.com`,
            phone: '1234567890',
            position: 'Developer',
            department: 'Engineering',
            hireDate: new Date(),
            status,
            teamIds: [],
          }));

          const stats = calculateEmployeeStatistics(employees);

          // Total should equal count
          expect(stats.totalEmployees).toBe(count);

          // Only the matching status should have count, others should be 0
          if (status === 'active') {
            expect(stats.activeEmployees).toBe(count);
            expect(stats.onLeaveEmployees).toBe(0);
            expect(stats.terminatedEmployees).toBe(0);
            expect(stats.activeEmployeeRate).toBe(100);
          } else if (status === 'on-leave') {
            expect(stats.activeEmployees).toBe(0);
            expect(stats.onLeaveEmployees).toBe(count);
            expect(stats.terminatedEmployees).toBe(0);
            expect(stats.activeEmployeeRate).toBe(0);
          } else {
            expect(stats.activeEmployees).toBe(0);
            expect(stats.onLeaveEmployees).toBe(0);
            expect(stats.terminatedEmployees).toBe(count);
            expect(stats.activeEmployeeRate).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle all employees in same department', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
        fc.integer({ min: 1, max: 50 }),
        (department, count) => {
          // Create employees all in the same department
          const employees: Employee[] = Array.from({ length: count }, (_, i) => ({
            id: `emp-${i}`,
            employeeId: `EMP-${i}`,
            name: `Employee ${i}`,
            email: `emp${i}@example.com`,
            phone: '1234567890',
            position: 'Developer',
            department,
            hireDate: new Date(),
            status: 'active' as const,
            teamIds: [],
          }));

          const stats = calculateEmployeeStatistics(employees);

          // Department distribution should have only one entry
          expect(Object.keys(stats.departmentDistribution).length).toBe(1);
          expect(stats.departmentDistribution[department]).toBe(count);

          // Sorted departments should have only one entry
          expect(stats.sortedDepartments.length).toBe(1);
          expect(stats.sortedDepartments[0][0]).toBe(department);
          expect(stats.sortedDepartments[0][1]).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle employees with various department distributions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (employees) => {
          const stats = calculateEmployeeStatistics(employees);

          // Each department in distribution should have at least 1 employee
          Object.values(stats.departmentDistribution).forEach(count => {
            expect(count).toBeGreaterThanOrEqual(1);
          });

          // Each department in sorted list should be in the distribution
          stats.sortedDepartments.forEach(([dept, count]) => {
            expect(stats.departmentDistribution[dept]).toBe(count);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
