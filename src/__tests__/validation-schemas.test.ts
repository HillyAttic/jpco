/**
 * Property-Based Tests for Validation Schemas
 * Feature: management-pages
 * 
 * This file contains property-based tests for validation schemas:
 * - Property 4: Invalid Input Rejection
 * - Property 5: Email Validation
 * - Property 6: Phone Validation
 * - Property 7: Date Validation
 * 
 * Validates: Requirements 1.4, 6.1, 6.2, 6.3, 6.4
 */

import fc from 'fast-check';
import {
  clientSchema,
  taskSchema,
  recurringTaskSchema,
  teamSchema,
  employeeSchema,
} from '@/lib/validation';

// Set timeout for property-based tests
jest.setTimeout(60000);

// ============================================================================
// Property 4: Invalid Input Rejection
// Test validation rejects all invalid inputs
// Validates: Requirements 1.4, 6.1
// ============================================================================

describe('Feature: management-pages, Property 4: Invalid Input Rejection', () => {
  it('should reject client data with empty required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant(''),
          email: fc.emailAddress(),
          phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
          company: fc.stringMatching(/^[A-Za-z]{2,20}( [A-Za-z]{2,20})?$/),
        }),
        (invalidData) => {
          const result = clientSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('name'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject task data with empty title', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.constant(''),
          description: fc.string({ maxLength: 100 }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          assignedTo: fc.array(fc.uuid(), { minLength: 1 }),
        }),
        (invalidData) => {
          const result = taskSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('title'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject task data with no assignees', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 100 }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          assignedTo: fc.constant([]),
        }),
        (invalidData) => {
          const result = taskSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('assignedTo'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject team data with empty required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant(''),
          description: fc.string({ maxLength: 100 }),
          leaderId: fc.uuid(),
        }),
        (invalidData) => {
          const result = teamSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('name'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject team data with empty leader ID', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ maxLength: 100 }),
          leaderId: fc.constant(''),
        }),
        (invalidData) => {
          const result = teamSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('leaderId'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject employee data with empty required fields', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            name: fc.constant(''),
            email: fc.emailAddress(),
            phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
            position: fc.string({ minLength: 1, maxLength: 50 }),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            hireDate: fc.date({ max: new Date() }),
          }),
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
            position: fc.constant(''),
            department: fc.string({ minLength: 1, maxLength: 50 }),
            hireDate: fc.date({ max: new Date() }),
          }),
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
            position: fc.string({ minLength: 1, maxLength: 50 }),
            department: fc.constant(''),
            hireDate: fc.date({ max: new Date() }),
          })
        ),
        (invalidData) => {
          const result = employeeSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject data with fields exceeding maximum length', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 101, maxLength: 200 }),
          email: fc.emailAddress(),
          phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
          company: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (invalidData) => {
          const result = clientSchema.safeParse(invalidData);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('name'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 5: Email Validation
// Test email validation for all invalid email formats
// Validates: Requirements 6.2
// ============================================================================

describe('Feature: management-pages, Property 5: Email Validation', () => {
  it('should reject emails without @ symbol', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9]{3,20}$/), // No @ symbol
        (invalidEmail) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: invalidEmail,
            phone: '+1234567890',
            company: 'Test Company',
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => 
              issue.path.includes('email') && issue.message.toLowerCase().includes('email')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject emails without domain', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9]{3,20}@$/), // No domain after @
        (invalidEmail) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: invalidEmail,
            phone: '+1234567890',
            company: 'Test Company',
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject emails with spaces', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-z]{3,10}$/),
          fc.stringMatching(/^[a-z]{3,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/),
          fc.stringMatching(/^[a-z]{2,3}$/)
        ).map(([local, space, domain, tld]) => `${local} ${space}@${domain}.${tld}`),
        (invalidEmail) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: invalidEmail,
            phone: '+1234567890',
            position: 'Developer',
            department: 'Engineering',
            hireDate: new Date('2020-01-01'),
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject emails with multiple @ symbols', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-z]{3,10}$/),
          fc.stringMatching(/^[a-z]{3,10}$/),
          fc.stringMatching(/^[a-z]{2,5}$/),
          fc.stringMatching(/^[a-z]{2,3}$/)
        ).map(([local1, local2, domain, tld]) => `${local1}@${local2}@${domain}.${tld}`),
        (invalidEmail) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: invalidEmail,
            phone: '+1234567890',
            company: 'Test Company',
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject emails without TLD', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-z]{3,10}$/),
          fc.stringMatching(/^[a-z]{3,10}$/)
        ).map(([local, domain]) => `${local}@${domain}`),
        (invalidEmail) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: invalidEmail,
            phone: '+1234567890',
            position: 'Developer',
            department: 'Engineering',
            hireDate: new Date('2020-01-01'),
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid email formats', () => {
    fc.assert(
      fc.property(
        fc.emailAddress().filter(email => {
          // Filter to match our validation: alphanumeric, dots, underscores, hyphens only in local part
          const localPart = email.split('@')[0];
          return /^[a-zA-Z0-9._-]+$/.test(localPart) && /^[a-zA-Z0-9]/.test(localPart);
        }),
        (validEmail) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: validEmail,
            phone: '+1234567890',
            company: 'Test Company',
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 6: Phone Validation
// Test phone validation for all invalid phone formats
// Validates: Requirements 6.3
// ============================================================================

describe('Feature: management-pages, Property 6: Phone Validation', () => {
  it('should reject phone numbers with letters', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z]{5,15}$/), // Only letters
        (invalidPhone) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: invalidPhone,
            company: 'Test Company',
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => 
              issue.path.includes('phone') && issue.message.toLowerCase().includes('phone')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject phone numbers with special characters (except allowed ones)', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[0-9]{3,5}$/),
          fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '=', '[', ']', '{', '}'),
          fc.stringMatching(/^[0-9]{3,5}$/)
        ).map(([part1, special, part2]) => `${part1}${special}${part2}`),
        (invalidPhone) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: invalidPhone,
            position: 'Developer',
            department: 'Engineering',
            hireDate: new Date('2020-01-01'),
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('phone'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject phone numbers that are too short', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9]{1,9}$/), // Less than 10 digits (too short)
        (invalidPhone) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: invalidPhone,
            company: 'Test Company',
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => issue.path.includes('phone'))).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid phone formats with digits only', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9]{10,15}$/),
        (validPhone) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: validPhone,
            company: 'Test Company',
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid phone formats with + prefix', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\+[0-9]{10,15}$/),
        (validPhone) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: validPhone,
            position: 'Developer',
            department: 'Engineering',
            hireDate: new Date('2020-01-01'),
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid phone formats with spaces and hyphens', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[0-9]{3}$/),
          fc.stringMatching(/^[0-9]{3}$/),
          fc.stringMatching(/^[0-9]{4}$/)
        ).map(([part1, part2, part3]) => `${part1}-${part2}-${part3}`),
        (validPhone) => {
          const result = clientSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: validPhone,
            company: 'Test Company',
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid phone formats with parentheses', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[0-9]{3}$/),
          fc.stringMatching(/^[0-9]{3}$/),
          fc.stringMatching(/^[0-9]{4}$/)
        ).map(([part1, part2, part3]) => `(${part1}) ${part2}-${part3}`),
        (validPhone) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: validPhone,
            position: 'Developer',
            department: 'Engineering',
            hireDate: new Date('2020-01-01'),
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 7: Date Validation
// Test date validation rejects past dates for future fields
// Validates: Requirements 6.4
// ============================================================================

describe('Feature: management-pages, Property 7: Date Validation', () => {
  it('should reject past dates for task due dates', () => {
    fc.assert(
      fc.property(
        fc.date({ max: new Date(Date.now() - 24 * 60 * 60 * 1000) }), // At least 1 day in the past
        (pastDate) => {
          const result = taskSchema.safeParse({
            title: 'Test Task',
            description: 'Test description',
            dueDate: pastDate,
            priority: 'medium',
            assignedTo: ['user-123'],
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => 
              issue.path.includes('dueDate') && issue.message.toLowerCase().includes('future')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject future dates for employee hire dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).filter(date => !isNaN(date.getTime())), // At least 1 day in the future, filter out NaN
        (futureDate) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: '+1234567890',
            position: 'Developer',
            department: 'Engineering',
            hireDate: futureDate,
          });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => 
              issue.path.includes('hireDate') && issue.message.toLowerCase().includes('future')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept today as valid hire date', () => {
    fc.assert(
      fc.property(
        fc.constant(new Date()),
        (today) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: '+1234567890',
            position: 'Developer',
            department: 'Engineering',
            hireDate: today,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept today as valid task due date', () => {
    fc.assert(
      fc.property(
        fc.constant(new Date()),
        (today) => {
          const result = taskSchema.safeParse({
            title: 'Test Task',
            description: 'Test description',
            dueDate: today,
            priority: 'medium',
            assignedTo: ['user-123'],
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept future dates for task due dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).filter(date => !isNaN(date.getTime())), // At least 1 day in the future, filter out NaN
        (futureDate) => {
          const result = taskSchema.safeParse({
            title: 'Test Task',
            description: 'Test description',
            dueDate: futureDate,
            priority: 'medium',
            assignedTo: ['user-123'],
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept past dates for employee hire dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date() }),
        (pastDate) => {
          const result = employeeSchema.safeParse({
            name: 'John Doe',
            email: 'test@example.com',
            phone: '+1234567890',
            position: 'Developer',
            department: 'Engineering',
            hireDate: pastDate,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject end date before start date in recurring tasks', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }).filter(date => !isNaN(date.getTime())),
          fc.integer({ min: 1, max: 365 })
        ),
        ([startDate, daysBack]) => {
          const endDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
          
          const result = recurringTaskSchema.safeParse({
            title: 'Test Recurring Task',
            description: 'Test description',
            priority: 'medium',
            assignedTo: ['user-123'],
            recurrencePattern: 'weekly',
            startDate: startDate,
            endDate: endDate,
          });
          
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(issue => 
              issue.path.includes('endDate') && issue.message.toLowerCase().includes('after')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept end date after start date in recurring tasks', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }).filter(date => !isNaN(date.getTime())),
          fc.integer({ min: 1, max: 180 })
        ),
        ([startDate, daysAfter]) => {
          const endDate = new Date(startDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);
          
          const result = recurringTaskSchema.safeParse({
            title: 'Test Recurring Task',
            description: 'Test description',
            priority: 'medium',
            assignedTo: ['user-123'],
            recurrencePattern: 'weekly',
            startDate: startDate,
            endDate: endDate,
          });
          
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
