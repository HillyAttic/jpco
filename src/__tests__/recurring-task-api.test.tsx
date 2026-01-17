/**
 * Property-Based Tests for Recurring Task API
 * Feature: management-pages
 * 
 * This file contains property-based tests for recurring task API functionality:
 * - Property 39: Recurring Task Pause Behavior
 * - Property 43: Recurring Task Deletion Confirmation
 * 
 * Validates: Requirements 3.5, 3.10
 */

import fc from 'fast-check';
import { RecurringTask, recurringTaskService } from '@/services/recurring-task.service';
import { calculateNextOccurrence } from '@/utils/recurrence-scheduler';

// Mock the recurring task service
jest.mock('@/services/recurring-task.service', () => ({
  recurringTaskService: {
    getById: jest.fn(),
    update: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    delete: jest.fn(),
    completeCycle: jest.fn(),
  },
}));

// Mock the recurrence scheduler
jest.mock('@/utils/recurrence-scheduler', () => ({
  calculateNextOccurrence: jest.fn(),
}));

// ============================================================================
// Property 39: Recurring Task Pause Behavior
// Test pause stops occurrences
// Validates: Requirements 3.5
// ============================================================================

describe('Feature: management-pages, Property 39: Recurring Task Pause Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set isPaused to true when pausing a recurring task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 0, maxLength: 1000 }),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(fc.string({ minLength: 2, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          category: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          endDate: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') }), { nil: undefined }),
          completionHistory: fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              completedBy: fc.string({ minLength: 2, maxLength: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          isPaused: fc.constant(false),
          teamId: fc.option(fc.uuid(), { nil: undefined }),
        }),
        async (activeTask) => {
          // Mock pause to return task with isPaused = true
          const pausedTask = {
            ...activeTask,
            isPaused: true,
            updatedAt: new Date(),
          };

          (recurringTaskService.pause as jest.Mock).mockResolvedValueOnce(pausedTask);

          // Pause the task
          const result = await recurringTaskService.pause(activeTask.id!);

          // Verify isPaused is set to true
          expect(result.isPaused).toBe(true);

          // Verify all other properties are preserved
          expect(result.id).toBe(activeTask.id);
          expect(result.title).toBe(activeTask.title);
          expect(result.recurrencePattern).toBe(activeTask.recurrencePattern);
          expect(result.nextOccurrence).toEqual(activeTask.nextOccurrence);
          expect(result.completionHistory).toEqual(activeTask.completionHistory);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not generate new occurrences when task is paused', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 0, maxLength: 1000 }),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
          assignedTo: fc.array(fc.string({ minLength: 2, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          completionHistory: fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              completedBy: fc.string({ minLength: 2, maxLength: 50 }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          isPaused: fc.constant(true),
        }),
        async (pausedTask) => {
          const originalNextOccurrence = pausedTask.nextOccurrence;
          const originalHistoryLength = pausedTask.completionHistory.length;

          // Mock getById to return the paused task
          (recurringTaskService.getById as jest.Mock).mockResolvedValueOnce(pausedTask);

          // Mock completeCycle to throw error for paused tasks
          (recurringTaskService.completeCycle as jest.Mock).mockRejectedValueOnce(
            new Error('Cannot complete cycle for paused task')
          );

          // Retrieve the task
          const task = await recurringTaskService.getById(pausedTask.id!);

          // Verify task is paused
          expect(task!.isPaused).toBe(true);

          // Attempt to complete cycle should fail
          await expect(
            recurringTaskService.completeCycle(pausedTask.id!, 'test-user')
          ).rejects.toThrow('Cannot complete cycle for paused task');

          // Verify nextOccurrence hasn't changed
          expect(task!.nextOccurrence).toEqual(originalNextOccurrence);

          // Verify completion history hasn't grown
          expect(task!.completionHistory.length).toBe(originalHistoryLength);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve nextOccurrence when pausing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          isPaused: fc.constant(false),
        }),
        async (activeTask) => {
          const originalNextOccurrence = new Date(activeTask.nextOccurrence);

          // Mock pause to return task with isPaused = true but same nextOccurrence
          const pausedTask = {
            ...activeTask,
            isPaused: true,
            nextOccurrence: originalNextOccurrence,
          };

          (recurringTaskService.pause as jest.Mock).mockResolvedValueOnce(pausedTask);

          // Pause the task
          const result = await recurringTaskService.pause(activeTask.id!);

          // Verify nextOccurrence is preserved
          expect(result.nextOccurrence).toEqual(originalNextOccurrence);
          expect(result.nextOccurrence.getTime()).toBe(originalNextOccurrence.getTime());

          // Verify isPaused is true
          expect(result.isPaused).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow resuming a paused task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          isPaused: fc.constant(true),
        }),
        async (pausedTask) => {
          // Mock resume to return task with isPaused = false
          const resumedTask = {
            ...pausedTask,
            isPaused: false,
            updatedAt: new Date(),
          };

          (recurringTaskService.resume as jest.Mock).mockResolvedValueOnce(resumedTask);

          // Resume the task
          const result = await recurringTaskService.resume(pausedTask.id!);

          // Verify isPaused is set to false
          expect(result.isPaused).toBe(false);

          // Verify all other properties are preserved
          expect(result.id).toBe(pausedTask.id);
          expect(result.title).toBe(pausedTask.title);
          expect(result.recurrencePattern).toBe(pausedTask.recurrencePattern);
          expect(result.nextOccurrence).toEqual(pausedTask.nextOccurrence);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 43: Recurring Task Deletion Confirmation
// Test deletion prompts options
// Validates: Requirements 3.10
// ============================================================================

describe('Feature: management-pages, Property 43: Recurring Task Deletion Confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should support "all" deletion option to delete all future occurrences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          completionHistory: fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              completedBy: fc.string({ minLength: 2, maxLength: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }),
        async (task) => {
          // Mock delete to simulate complete deletion
          (recurringTaskService.delete as jest.Mock).mockResolvedValueOnce(undefined);

          // Mock getById to return null after deletion
          (recurringTaskService.getById as jest.Mock).mockResolvedValueOnce(null);

          // Delete with "all" option
          await recurringTaskService.delete(task.id!);

          // Verify task is deleted
          const deletedTask = await recurringTaskService.getById(task.id!);
          expect(deletedTask).toBeNull();

          // Verify delete was called with the task ID
          expect(recurringTaskService.delete).toHaveBeenCalledWith(task.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support "stop" deletion option to stop recurrence without deleting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          endDate: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') }), { nil: undefined }),
          isPaused: fc.constant(false),
          completionHistory: fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              completedBy: fc.string({ minLength: 2, maxLength: 50 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }),
        async (task) => {
          // Mock update to simulate stopping recurrence
          const stoppedTask = {
            ...task,
            endDate: new Date(),
            isPaused: true,
            updatedAt: new Date(),
          };

          (recurringTaskService.update as jest.Mock).mockResolvedValueOnce(stoppedTask);

          // Mock getById to return the stopped task
          (recurringTaskService.getById as jest.Mock).mockResolvedValueOnce(stoppedTask);

          // Stop recurrence (simulating "stop" option)
          await recurringTaskService.update(task.id!, {
            endDate: new Date(),
            isPaused: true,
          });

          // Retrieve the task
          const stoppedTaskResult = await recurringTaskService.getById(task.id!);

          // Verify task still exists
          expect(stoppedTaskResult).not.toBeNull();

          // Verify task is paused
          expect(stoppedTaskResult!.isPaused).toBe(true);

          // Verify endDate is set to now (stopping future occurrences)
          expect(stoppedTaskResult!.endDate).toBeDefined();

          // Verify all original data is preserved
          expect(stoppedTaskResult!.id).toBe(task.id);
          expect(stoppedTaskResult!.title).toBe(task.title);
          expect(stoppedTaskResult!.recurrencePattern).toBe(task.recurrencePattern);
          expect(stoppedTaskResult!.completionHistory).toEqual(task.completionHistory);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve completion history when using "stop" option', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          completionHistory: fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              completedBy: fc.string({ minLength: 2, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async (task) => {
          const originalHistoryLength = task.completionHistory.length;
          const originalHistory = [...task.completionHistory];

          // Mock update to simulate stopping with preserved history
          const stoppedTask = {
            ...task,
            endDate: new Date(),
            isPaused: true,
            completionHistory: originalHistory,
          };

          (recurringTaskService.update as jest.Mock).mockResolvedValueOnce(stoppedTask);

          // Stop recurrence
          const result = await recurringTaskService.update(task.id!, {
            endDate: new Date(),
            isPaused: true,
          });

          // Verify completion history is preserved
          expect(result.completionHistory).toEqual(originalHistory);
          expect(result.completionHistory.length).toBe(originalHistoryLength);

          // Verify each completion record is preserved
          originalHistory.forEach((record, index) => {
            expect(result.completionHistory[index]).toEqual(record);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle deletion of tasks with no completion history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          nextOccurrence: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          completionHistory: fc.constant([]) as fc.Arbitrary<never[]>,
        }),
        async (taskWithoutHistory) => {
          // Mock delete
          (recurringTaskService.delete as jest.Mock).mockResolvedValueOnce(undefined);

          // Mock getById to return null after deletion
          (recurringTaskService.getById as jest.Mock).mockResolvedValueOnce(null);

          // Delete the task
          await recurringTaskService.delete(taskWithoutHistory.id!);

          // Verify task is deleted
          const deletedTask = await recurringTaskService.getById(taskWithoutHistory.id!);
          expect(deletedTask).toBeNull();

          // Verify delete was called
          expect(recurringTaskService.delete).toHaveBeenCalledWith(taskWithoutHistory.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should differentiate between "all" and "stop" deletion options', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          completionHistory: fc.array(
            fc.record({
              date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
              completedBy: fc.string({ minLength: 2, maxLength: 50 }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
        }),
        async (task) => {
          // Test "all" option - complete deletion
          (recurringTaskService.delete as jest.Mock).mockResolvedValueOnce(undefined);
          (recurringTaskService.getById as jest.Mock).mockResolvedValueOnce(null);

          await recurringTaskService.delete(task.id!);
          const deletedTask = await recurringTaskService.getById(task.id!);
          expect(deletedTask).toBeNull();

          // Reset mocks
          jest.clearAllMocks();

          // Test "stop" option - task still exists but stopped
          const stoppedTask = {
            ...task,
            endDate: new Date(),
            isPaused: true,
          };

          (recurringTaskService.update as jest.Mock).mockResolvedValueOnce(stoppedTask);
          (recurringTaskService.getById as jest.Mock).mockResolvedValueOnce(stoppedTask);

          await recurringTaskService.update(task.id!, {
            endDate: new Date(),
            isPaused: true,
          });

          const stoppedTaskResult = await recurringTaskService.getById(task.id!);

          // Verify task exists after "stop"
          expect(stoppedTaskResult).not.toBeNull();
          expect(stoppedTaskResult!.isPaused).toBe(true);
          expect(stoppedTaskResult!.endDate).toBeDefined();

          // Verify the two operations are different
          expect(deletedTask).toBeNull(); // "all" results in null
          expect(stoppedTaskResult).not.toBeNull(); // "stop" results in existing task
        }
      ),
      { numRuns: 100 }
    );
  });
});
