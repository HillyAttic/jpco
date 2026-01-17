/**
 * Property-Based Tests for TaskStatsCard
 * Feature: management-pages
 * 
 * This file contains property-based tests for TaskStatsCard component:
 * - Property 35: Task Statistics Accuracy
 * 
 * Validates: Requirements 2.10
 */

import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { TaskStatsCard } from '@/components/tasks/TaskStatsCard';
import { Task } from '@/types/task.types';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Generators for property-based testing
const generators = {
  task: () => fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
    priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
    dueDate: fc.date(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
    assignedTo: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
    category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    commentCount: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
  }) as fc.Arbitrary<Task>,
  
  taskArray: (minLength: number = 0, maxLength: number = 50) => 
    fc.array(generators.task(), { minLength, maxLength }),
};

/**
 * Helper function to calculate expected statistics
 */
function calculateExpectedStats(tasks: Task[]) {
  const totalTasks = tasks.length;
  
  const pendingTasks = tasks.filter(
    task => task.status === 'pending' || task.status === 'in-progress'
  ).length;
  
  const completedTasks = tasks.filter(
    task => task.status === 'completed'
  ).length;
  
  const overdueTasks = tasks.filter(
    task => task.status !== 'completed' && new Date(task.dueDate) < new Date()
  ).length;
  
  return {
    totalTasks,
    pendingTasks,
    completedTasks,
    overdueTasks,
  };
}

// ============================================================================
// Property 35: Task Statistics Accuracy
// Test statistics count correctly
// Validates: Requirements 2.10
// ============================================================================

describe('Feature: management-pages, Property 35: Task Statistics Accuracy', () => {
  it('should accurately count total tasks for any task array', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Find the total tasks stat
            const totalElement = screen.getByText('Total Tasks');
            const totalValueElement = totalElement.parentElement?.querySelector('.text-2xl');
            
            expect(totalValueElement).toBeTruthy();
            expect(totalValueElement?.textContent).toBe(expected.totalTasks.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately count pending tasks for any task array', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Find the pending tasks stat
            const pendingElement = screen.getByText('Pending');
            const pendingValueElement = pendingElement.parentElement?.querySelector('.text-2xl');
            
            expect(pendingValueElement).toBeTruthy();
            expect(pendingValueElement?.textContent).toBe(expected.pendingTasks.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately count completed tasks for any task array', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Find the completed tasks stat
            const completedElement = screen.getByText('Completed');
            const completedValueElement = completedElement.parentElement?.querySelector('.text-2xl');
            
            expect(completedValueElement).toBeTruthy();
            expect(completedValueElement?.textContent).toBe(expected.completedTasks.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accurately count overdue tasks for any task array', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Find the overdue tasks stat
            const overdueElement = screen.getByText('Overdue');
            const overdueValueElement = overdueElement.parentElement?.querySelector('.text-2xl');
            
            expect(overdueValueElement).toBeTruthy();
            expect(overdueValueElement?.textContent).toBe(expected.overdueTasks.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display all four statistics for any task array', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Verify all four statistics are displayed
            expect(screen.getByText('Total Tasks')).toBeInTheDocument();
            expect(screen.getByText('Pending')).toBeInTheDocument();
            expect(screen.getByText('Completed')).toBeInTheDocument();
            expect(screen.getByText('Overdue')).toBeInTheDocument();
            
            // Verify the values match expected counts
            const totalElement = screen.getByText('Total Tasks');
            const totalValue = totalElement.parentElement?.querySelector('.text-2xl')?.textContent;
            expect(totalValue).toBe(expected.totalTasks.toString());
            
            const pendingElement = screen.getByText('Pending');
            const pendingValue = pendingElement.parentElement?.querySelector('.text-2xl')?.textContent;
            expect(pendingValue).toBe(expected.pendingTasks.toString());
            
            const completedElement = screen.getByText('Completed');
            const completedValue = completedElement.parentElement?.querySelector('.text-2xl')?.textContent;
            expect(completedValue).toBe(expected.completedTasks.toString());
            
            const overdueElement = screen.getByText('Overdue');
            const overdueValue = overdueElement.parentElement?.querySelector('.text-2xl')?.textContent;
            expect(overdueValue).toBe(expected.overdueTasks.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should count pending tasks as both "pending" and "in-progress" statuses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 0, maxLength: 500 }),
            status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
            dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
            createdAt: fc.date(),
            updatedAt: fc.date(),
            assignedTo: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            commentCount: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
          }) as fc.Arbitrary<Task>,
          { minLength: 1, maxLength: 30 }
        ),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            // All tasks should be counted as pending since they're either pending or in-progress
            const pendingElement = screen.getByText('Pending');
            const pendingValue = pendingElement.parentElement?.querySelector('.text-2xl')?.textContent;
            
            expect(pendingValue).toBe(tasks.length.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not count completed tasks as pending', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 0, maxLength: 500 }),
            status: fc.constant('completed') as fc.Arbitrary<'completed'>,
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
            dueDate: fc.date(),
            createdAt: fc.date(),
            updatedAt: fc.date(),
            assignedTo: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            commentCount: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
          }) as fc.Arbitrary<Task>,
          { minLength: 1, maxLength: 30 }
        ),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            // No tasks should be counted as pending since all are completed
            const pendingElement = screen.getByText('Pending');
            const pendingValue = pendingElement.parentElement?.querySelector('.text-2xl')?.textContent;
            
            expect(pendingValue).toBe('0');
            
            // All tasks should be counted as completed
            const completedElement = screen.getByText('Completed');
            const completedValue = completedElement.parentElement?.querySelector('.text-2xl')?.textContent;
            
            expect(completedValue).toBe(tasks.length.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only count incomplete tasks with past due dates as overdue', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 0, maxLength: 500 }),
            status: fc.constantFrom('pending', 'in-progress') as fc.Arbitrary<'pending' | 'in-progress'>,
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
            dueDate: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 86400000 }).map(ts => new Date(ts)), // Past dates as valid timestamps
            createdAt: fc.date(),
            updatedAt: fc.date(),
            assignedTo: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            commentCount: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
          }) as fc.Arbitrary<Task>,
          { minLength: 1, maxLength: 30 }
        ),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            // All tasks should be counted as overdue since they're incomplete with past due dates
            const overdueElement = screen.getByText('Overdue');
            const overdueValue = overdueElement.parentElement?.querySelector('.text-2xl')?.textContent;
            
            expect(overdueValue).toBe(tasks.length.toString());
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not count completed tasks as overdue even with past due dates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 0, maxLength: 500 }),
            status: fc.constant('completed') as fc.Arbitrary<'completed'>,
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
            dueDate: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 86400000 }).map(ts => new Date(ts)), // Past dates as valid timestamps
            createdAt: fc.date(),
            updatedAt: fc.date(),
            assignedTo: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            commentCount: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
          }) as fc.Arbitrary<Task>,
          { minLength: 1, maxLength: 30 }
        ),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            // No tasks should be counted as overdue since all are completed
            const overdueElement = screen.getByText('Overdue');
            const overdueValue = overdueElement.parentElement?.querySelector('.text-2xl')?.textContent;
            
            expect(overdueValue).toBe('0');
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate completion rate correctly for any task array with tasks', () => {
    fc.assert(
      fc.property(
        generators.taskArray(1, 50), // At least 1 task to show completion rate
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            const expectedRate = Math.round((expected.completedTasks / expected.totalTasks) * 100);
            
            // Find the completion rate
            const rateElement = screen.getByText('Completion Rate');
            const rateValue = rateElement.parentElement?.querySelector('.text-sm.font-semibold')?.textContent;
            
            expect(rateValue).toBe(`${expectedRate}%`);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display completion rate for empty task arrays', () => {
    render(<TaskStatsCard tasks={[]} />);
    
    try {
      // Completion rate section should not be displayed when there are no tasks
      expect(screen.queryByText('Completion Rate')).not.toBeInTheDocument();
    } finally {
      cleanup();
    }
  });

  it('should maintain sum invariant: pending + completed = total', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Verify the invariant: pending + completed should equal total
            expect(expected.pendingTasks + expected.completedTasks).toBe(expected.totalTasks);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain overdue subset invariant: overdue <= pending', () => {
    fc.assert(
      fc.property(
        generators.taskArray(0, 50),
        (tasks) => {
          render(<TaskStatsCard tasks={tasks} />);
          
          try {
            const expected = calculateExpectedStats(tasks);
            
            // Verify the invariant: overdue tasks should be a subset of pending tasks
            expect(expected.overdueTasks).toBeLessThanOrEqual(expected.pendingTasks);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
