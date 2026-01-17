/**
 * Property-Based Tests for Recurrence Scheduler
 * Feature: management-pages
 * 
 * This file contains property-based tests for recurrence scheduling functionality:
 * - Property 38: Recurrence Scheduling
 * 
 * Validates: Requirements 3.4
 */

import fc from 'fast-check';
import {
  calculateNextOccurrence,
  calculateDailyRecurrence,
  calculateWeeklyRecurrence,
  calculateMonthlyRecurrence,
  calculateQuarterlyRecurrence,
  RecurrencePattern,
} from '@/utils/recurrence-scheduler';

// ============================================================================
// Property 38: Recurrence Scheduling
// Test next occurrence calculated correctly
// Validates: Requirements 3.4
// ============================================================================

describe('Feature: management-pages, Property 38: Recurrence Scheduling', () => {
  describe('Daily Recurrence', () => {
    it('should calculate next occurrence exactly 1 day later for any date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateDailyRecurrence(currentDate);
            
            // Calculate expected date (1 day later)
            const expected = new Date(currentDate);
            expected.setDate(expected.getDate() + 1);
            
            // Verify next occurrence is exactly 1 day later
            const diffInMs = nextDate.getTime() - currentDate.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            
            expect(diffInDays).toBeCloseTo(1, 5);
            expect(nextDate.getDate()).toBe(expected.getDate());
            expect(nextDate.getMonth()).toBe(expected.getMonth());
            expect(nextDate.getFullYear()).toBe(expected.getFullYear());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle month boundaries correctly for daily recurrence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 0, max: 11 }),
          (year, month) => {
            // Get last day of month
            const lastDay = new Date(year, month + 1, 0).getDate();
            const currentDate = new Date(year, month, lastDay);
            
            const nextDate = calculateDailyRecurrence(currentDate);
            
            // Should be first day of next month
            expect(nextDate.getDate()).toBe(1);
            
            // Verify it's the next month (or next year if December)
            if (month === 11) {
              expect(nextDate.getMonth()).toBe(0);
              expect(nextDate.getFullYear()).toBe(year + 1);
            } else {
              expect(nextDate.getMonth()).toBe(month + 1);
              expect(nextDate.getFullYear()).toBe(year);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Weekly Recurrence', () => {
    it('should calculate next occurrence exactly 7 days later for any date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateWeeklyRecurrence(currentDate);
            
            // Calculate expected date (7 days later)
            const expected = new Date(currentDate);
            expected.setDate(expected.getDate() + 7);
            
            // Verify next occurrence is exactly 7 days later
            const diffInMs = nextDate.getTime() - currentDate.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            
            expect(diffInDays).toBeCloseTo(7, 5);
            expect(nextDate.getDate()).toBe(expected.getDate());
            expect(nextDate.getMonth()).toBe(expected.getMonth());
            expect(nextDate.getFullYear()).toBe(expected.getFullYear());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve day of week for weekly recurrence', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateWeeklyRecurrence(currentDate);
            
            // Day of week should be the same
            expect(nextDate.getDay()).toBe(currentDate.getDay());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Monthly Recurrence', () => {
    it('should calculate next occurrence exactly 1 month later for any date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-11-30') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateMonthlyRecurrence(currentDate);
            
            // Verify month is incremented by 1 (or wrapped to next year)
            const expectedMonth = (currentDate.getMonth() + 1) % 12;
            const expectedYear = currentDate.getMonth() === 11 
              ? currentDate.getFullYear() + 1 
              : currentDate.getFullYear();
            
            expect(nextDate.getMonth()).toBe(expectedMonth);
            expect(nextDate.getFullYear()).toBe(expectedYear);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve day of month when possible for monthly recurrence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 0, max: 11 }),
          fc.integer({ min: 1, max: 28 }), // Use day 1-28 to avoid month-end edge cases
          (year, month, day) => {
            const currentDate = new Date(year, month, day);
            const nextDate = calculateMonthlyRecurrence(currentDate);
            
            // Day should be preserved for dates 1-28
            expect(nextDate.getDate()).toBe(day);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle month-end dates correctly for monthly recurrence', () => {
      // Test January 31 -> February (28 or 29)
      const jan31_2020 = new Date(2020, 0, 31); // Leap year
      const feb_2020 = calculateMonthlyRecurrence(jan31_2020);
      expect(feb_2020.getMonth()).toBe(1); // February
      expect(feb_2020.getDate()).toBe(29); // Last day of February in leap year

      const jan31_2021 = new Date(2021, 0, 31); // Non-leap year
      const feb_2021 = calculateMonthlyRecurrence(jan31_2021);
      expect(feb_2021.getMonth()).toBe(1); // February
      expect(feb_2021.getDate()).toBe(28); // Last day of February in non-leap year

      // Test March 31 -> April 30
      const mar31 = new Date(2020, 2, 31);
      const apr30 = calculateMonthlyRecurrence(mar31);
      expect(apr30.getMonth()).toBe(3); // April
      expect(apr30.getDate()).toBe(30); // Last day of April
    });

    it('should handle year boundaries correctly for monthly recurrence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2029 }),
          fc.integer({ min: 1, max: 28 }),
          (year, day) => {
            const decDate = new Date(year, 11, day); // December
            const nextDate = calculateMonthlyRecurrence(decDate);
            
            // Should be January of next year
            expect(nextDate.getMonth()).toBe(0);
            expect(nextDate.getFullYear()).toBe(year + 1);
            expect(nextDate.getDate()).toBe(day);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Quarterly Recurrence', () => {
    it('should calculate next occurrence exactly 3 months later for any date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-09-30') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateQuarterlyRecurrence(currentDate);
            
            // Verify month is incremented by 3 (with year wrapping)
            const monthsToAdd = 3;
            const totalMonths = currentDate.getMonth() + monthsToAdd;
            const expectedMonth = totalMonths % 12;
            const expectedYear = currentDate.getFullYear() + Math.floor(totalMonths / 12);
            
            expect(nextDate.getMonth()).toBe(expectedMonth);
            expect(nextDate.getFullYear()).toBe(expectedYear);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve day of month when possible for quarterly recurrence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 0, max: 9 }), // Months 0-9 to avoid year boundary
          fc.integer({ min: 1, max: 28 }), // Use day 1-28 to avoid month-end edge cases
          (year, month, day) => {
            const currentDate = new Date(year, month, day);
            const nextDate = calculateQuarterlyRecurrence(currentDate);
            
            // Day should be preserved for dates 1-28
            expect(nextDate.getDate()).toBe(day);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle month-end dates correctly for quarterly recurrence', () => {
      // Test May 31 -> August 31
      const may31 = new Date(2020, 4, 31);
      const aug31 = calculateQuarterlyRecurrence(may31);
      expect(aug31.getMonth()).toBe(7); // August
      expect(aug31.getDate()).toBe(31);

      // Test August 31 -> November 30
      const aug31_2020 = new Date(2020, 7, 31);
      const nov30 = calculateQuarterlyRecurrence(aug31_2020);
      expect(nov30.getMonth()).toBe(10); // November
      expect(nov30.getDate()).toBe(30); // Last day of November

      // Test November 30 -> February (28 or 29)
      const nov30_2019 = new Date(2019, 10, 30);
      const feb_2020 = calculateQuarterlyRecurrence(nov30_2019);
      expect(feb_2020.getMonth()).toBe(1); // February
      expect(feb_2020.getDate()).toBe(29); // Last day of February in leap year
    });

    it('should handle year boundaries correctly for quarterly recurrence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2029 }),
          fc.integer({ min: 10, max: 11 }), // October or November
          fc.integer({ min: 1, max: 28 }),
          (year, month, day) => {
            const currentDate = new Date(year, month, day);
            const nextDate = calculateQuarterlyRecurrence(currentDate);
            
            // Should be in next year
            expect(nextDate.getFullYear()).toBe(year + 1);
            
            // Verify correct month (3 months later, wrapped)
            const expectedMonth = (month + 3) % 12;
            expect(nextDate.getMonth()).toBe(expectedMonth);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateNextOccurrence with pattern parameter', () => {
    it('should correctly delegate to daily recurrence for "daily" pattern', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateNextOccurrence(currentDate, 'daily');
            const expectedDate = calculateDailyRecurrence(currentDate);
            
            expect(nextDate.getTime()).toBe(expectedDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly delegate to weekly recurrence for "weekly" pattern', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateNextOccurrence(currentDate, 'weekly');
            const expectedDate = calculateWeeklyRecurrence(currentDate);
            
            expect(nextDate.getTime()).toBe(expectedDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly delegate to monthly recurrence for "monthly" pattern', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-11-30') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateNextOccurrence(currentDate, 'monthly');
            const expectedDate = calculateMonthlyRecurrence(currentDate);
            
            expect(nextDate.getTime()).toBe(expectedDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly delegate to quarterly recurrence for "quarterly" pattern', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-09-30') }).filter(d => !isNaN(d.getTime())),
          (currentDate) => {
            const nextDate = calculateNextOccurrence(currentDate, 'quarterly');
            const expectedDate = calculateQuarterlyRecurrence(currentDate);
            
            expect(nextDate.getTime()).toBe(expectedDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return a date after the current date for any valid pattern', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-09-30') }).filter(d => !isNaN(d.getTime())),
          fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<RecurrencePattern>,
          (currentDate, pattern) => {
            const nextDate = calculateNextOccurrence(currentDate, pattern);
            
            // Next occurrence should always be after current date
            expect(nextDate.getTime()).toBeGreaterThan(currentDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results when called multiple times with same inputs', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-09-30') }).filter(d => !isNaN(d.getTime())),
          fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<RecurrencePattern>,
          (currentDate, pattern) => {
            const nextDate1 = calculateNextOccurrence(currentDate, pattern);
            const nextDate2 = calculateNextOccurrence(currentDate, pattern);
            
            // Should produce identical results
            expect(nextDate1.getTime()).toBe(nextDate2.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create a valid sequence of occurrences when applied repeatedly', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }).filter(d => !isNaN(d.getTime())),
          fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<RecurrencePattern>,
          fc.integer({ min: 2, max: 10 }),
          (startDate, pattern, iterations) => {
            let currentDate = startDate;
            const occurrences = [new Date(currentDate)];
            
            // Generate sequence of occurrences
            for (let i = 0; i < iterations; i++) {
              currentDate = calculateNextOccurrence(currentDate, pattern);
              occurrences.push(new Date(currentDate));
            }
            
            // Verify sequence is strictly increasing
            for (let i = 1; i < occurrences.length; i++) {
              expect(occurrences[i].getTime()).toBeGreaterThan(occurrences[i - 1].getTime());
            }
            
            // Verify no duplicates
            const uniqueTimes = new Set(occurrences.map(d => d.getTime()));
            expect(uniqueTimes.size).toBe(occurrences.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases and Invariants', () => {
    it('should never return the same date as input', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-09-30') }).filter(d => !isNaN(d.getTime())),
          fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<RecurrencePattern>,
          (currentDate, pattern) => {
            const nextDate = calculateNextOccurrence(currentDate, pattern);
            
            // Next date should never equal current date
            expect(nextDate.getTime()).not.toBe(currentDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle leap years correctly for all patterns', () => {
      const leapYearDate = new Date(2020, 1, 29); // Feb 29, 2020
      
      // Daily should work fine
      const dailyNext = calculateDailyRecurrence(leapYearDate);
      expect(dailyNext.getMonth()).toBe(2); // March
      expect(dailyNext.getDate()).toBe(1);
      
      // Weekly should work fine
      const weeklyNext = calculateWeeklyRecurrence(leapYearDate);
      expect(weeklyNext.getMonth()).toBe(2); // March
      expect(weeklyNext.getDate()).toBe(7);
      
      // Monthly should handle Feb 29 -> Mar 29
      const monthlyNext = calculateMonthlyRecurrence(leapYearDate);
      expect(monthlyNext.getMonth()).toBe(2); // March
      expect(monthlyNext.getDate()).toBe(29);
      
      // Quarterly should handle Feb 29 -> May 29
      const quarterlyNext = calculateQuarterlyRecurrence(leapYearDate);
      expect(quarterlyNext.getMonth()).toBe(4); // May
      expect(quarterlyNext.getDate()).toBe(29);
    });

    it('should maintain time component of the date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-09-30') }).filter(d => !isNaN(d.getTime())),
          fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<RecurrencePattern>,
          (currentDate, pattern) => {
            const nextDate = calculateNextOccurrence(currentDate, pattern);
            
            // Time components should be preserved
            expect(nextDate.getHours()).toBe(currentDate.getHours());
            expect(nextDate.getMinutes()).toBe(currentDate.getMinutes());
            expect(nextDate.getSeconds()).toBe(currentDate.getSeconds());
            expect(nextDate.getMilliseconds()).toBe(currentDate.getMilliseconds());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
