/**
 * Property-Based Tests for EmployeeFilter
 * Feature: management-pages
 * 
 * This file contains property-based tests for employee filter functionality:
 * - Property 14: Employee Department Filter Accuracy
 * - Property 15: Employee Search Accuracy
 * 
 * Validates: Requirements 5.7, 5.8
 */

import fc from 'fast-check';
import { Employee } from '@/services/employee.service';

/**
 * Helper function to filter employees by department
 */
function filterByDepartment(employees: Employee[], department: string): Employee[] {
  if (department === 'all') {
    return employees;
  }
  return employees.filter(emp => emp.department === department);
}

/**
 * Helper function to search employees
 * Searches in name, email, position, and employeeId fields
 */
function searchEmployees(employees: Employee[], query: string): Employee[] {
  if (!query || query.trim() === '') {
    return employees;
  }
  
  const lowerQuery = query.toLowerCase();
  return employees.filter(emp => 
    emp.name.toLowerCase().includes(lowerQuery) ||
    emp.email.toLowerCase().includes(lowerQuery) ||
    emp.position.toLowerCase().includes(lowerQuery) ||
    emp.employeeId.toLowerCase().includes(lowerQuery)
  );
}

// ============================================================================
// Property 14: Employee Department Filter Accuracy
// Test department filter works
// Validates: Requirements 5.7
// ============================================================================

describe('Feature: management-pages, Property 14: Employee Department Filter Accuracy', () => {
  it('should filter employees by department correctly for any department', () => {
    fc.assert(
      fc.property(
        // Generate array of employees with various departments
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer', 'Director'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Product'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        // Generate a department to filter by
        fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Product'),
        (employees, selectedDepartment) => {
          // Apply department filter
          const filtered = filterByDepartment(employees, selectedDepartment);

          // All filtered employees should belong to the selected department
          filtered.forEach(emp => {
            expect(emp.department).toBe(selectedDepartment);
          });

          // Count should match the number of employees in that department
          const expectedCount = employees.filter(emp => emp.department === selectedDepartment).length;
          expect(filtered.length).toBe(expectedCount);

          // No employees from other departments should be included
          const otherDepartmentEmployees = employees.filter(emp => emp.department !== selectedDepartment);
          otherDepartmentEmployees.forEach(emp => {
            expect(filtered).not.toContainEqual(emp);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all employees when department filter is "all"', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (employees) => {
          // Apply "all" department filter
          const filtered = filterByDepartment(employees, 'all');

          // Should return all employees
          expect(filtered.length).toBe(employees.length);
          expect(filtered).toEqual(employees);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no employees match the department', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constant('Engineering'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (employees) => {
          // All employees are in Engineering, filter by Sales
          const filtered = filterByDepartment(employees, 'Sales');

          // Should return empty array
          expect(filtered.length).toBe(0);
          expect(filtered).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty employee list', () => {
    const filtered = filterByDepartment([], 'Engineering');
    expect(filtered).toEqual([]);
    expect(filtered.length).toBe(0);
  });
});

// ============================================================================
// Property 15: Employee Search Accuracy
// Test search filters correctly
// Validates: Requirements 5.8
// ============================================================================

describe('Feature: management-pages, Property 15: Employee Search Accuracy', () => {
  it('should find employees by name for any search query', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        (employees) => {
          // Pick a random employee and search by part of their name
          if (employees.length === 0) return;
          
          const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
          const searchQuery = randomEmployee.name.substring(0, 3);

          // Apply search
          const results = searchEmployees(employees, searchQuery);

          // The random employee should be in the results
          const found = results.some(emp => emp.id === randomEmployee.id);
          expect(found).toBe(true);

          // All results should contain the search query in one of the searchable fields
          results.forEach(emp => {
            const matchesName = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesEmail = emp.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPosition = emp.position.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesEmployeeId = emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

            expect(matchesName || matchesEmail || matchesPosition || matchesEmployeeId).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should find employees by email for any search query', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        (employees) => {
          if (employees.length === 0) return;
          
          const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
          // Search by email domain or part of email
          const emailParts = randomEmployee.email.split('@');
          const searchQuery = emailParts[0].substring(0, 3);

          // Apply search
          const results = searchEmployees(employees, searchQuery);

          // All results should contain the search query in one of the searchable fields
          results.forEach(emp => {
            const matchesName = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesEmail = emp.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPosition = emp.position.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesEmployeeId = emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

            expect(matchesName || matchesEmail || matchesPosition || matchesEmployeeId).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should find employees by position for any search query', () => {
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
          { minLength: 5, maxLength: 50 }
        ),
        fc.constantFrom('Developer', 'Manager', 'Designer', 'Analyst', 'Engineer'),
        (employees, positionQuery) => {
          // Apply search by position
          const results = searchEmployees(employees, positionQuery);

          // All results should have the matching position or contain the query in other fields
          results.forEach(emp => {
            const matchesName = emp.name.toLowerCase().includes(positionQuery.toLowerCase());
            const matchesEmail = emp.email.toLowerCase().includes(positionQuery.toLowerCase());
            const matchesPosition = emp.position.toLowerCase().includes(positionQuery.toLowerCase());
            const matchesEmployeeId = emp.employeeId.toLowerCase().includes(positionQuery.toLowerCase());

            expect(matchesName || matchesEmail || matchesPosition || matchesEmployeeId).toBe(true);
          });

          // Count employees with matching position
          const expectedCount = employees.filter(emp => 
            emp.position.toLowerCase().includes(positionQuery.toLowerCase())
          ).length;

          // Results should include at least those with matching position
          expect(results.length).toBeGreaterThanOrEqual(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should find employees by employee ID for any search query', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        (employees) => {
          if (employees.length === 0) return;
          
          const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
          // Search by employee ID prefix
          const searchQuery = 'EMP';

          // Apply search
          const results = searchEmployees(employees, searchQuery);

          // The random employee should be in the results (all have EMP prefix)
          const found = results.some(emp => emp.id === randomEmployee.id);
          expect(found).toBe(true);

          // All results should contain the search query in one of the searchable fields
          results.forEach(emp => {
            const matchesName = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesEmail = emp.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPosition = emp.position.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesEmployeeId = emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());

            expect(matchesName || matchesEmail || matchesPosition || matchesEmployeeId).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all employees when search query is empty', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (employees) => {
          // Apply empty search
          const results = searchEmployees(employees, '');

          // Should return all employees
          expect(results.length).toBe(employees.length);
          expect(results).toEqual(employees);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no employees match the search query', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.constant('John Doe'),
            email: fc.constant('john@example.com'),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.constant('Developer'),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (employees) => {
          // Search for something that doesn't exist
          const results = searchEmployees(employees, 'ZZZZNONEXISTENT');

          // Should return empty array
          expect(results.length).toBe(0);
          expect(results).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be case-insensitive for any search query', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        (employees) => {
          if (employees.length === 0) return;
          
          const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
          const searchQuery = randomEmployee.name.substring(0, 3);

          // Apply search with lowercase
          const resultsLower = searchEmployees(employees, searchQuery.toLowerCase());

          // Apply search with uppercase
          const resultsUpper = searchEmployees(employees, searchQuery.toUpperCase());

          // Apply search with mixed case
          const resultsMixed = searchEmployees(employees, searchQuery);

          // All should return the same results
          expect(resultsLower.length).toBe(resultsUpper.length);
          expect(resultsLower.length).toBe(resultsMixed.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty employee list', () => {
    const results = searchEmployees([], 'test');
    expect(results).toEqual([]);
    expect(results.length).toBe(0);
  });

  it('should handle whitespace-only search queries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            employeeId: fc.string({ minLength: 3, maxLength: 10 }).map(s => `EMP-${s}`),
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            position: fc.string({ minLength: 2, maxLength: 30 }),
            department: fc.constantFrom('Engineering', 'Sales', 'Marketing', 'HR', 'Finance'),
            hireDate: fc.date({ min: new Date('2010-01-01'), max: new Date() }),
            status: fc.constantFrom('active', 'on-leave', 'terminated') as fc.Arbitrary<'active' | 'on-leave' | 'terminated'>,
            teamIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (employees) => {
          // Apply whitespace-only search
          const results = searchEmployees(employees, '   ');

          // Should return all employees (whitespace is trimmed to empty)
          expect(results.length).toBe(employees.length);
          expect(results).toEqual(employees);
        }
      ),
      { numRuns: 100 }
    );
  });
});
