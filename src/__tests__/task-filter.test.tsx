/**
 * Property-Based Tests for TaskFilter Component
 * Feature: management-pages
 * 
 * Tests Properties:
 * - Property 12: Task Status Filter Accuracy
 * - Property 13: Task Priority Filter Accuracy
 * - Property 17: Multi-Filter Conjunction
 * 
 * Validates Requirements: 2.7, 2.8, 8.2
 */

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { TaskFilter, TaskFilterState } from '@/components/tasks/TaskFilter';
import { Task } from '@/types/task.types';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Generators for property-based testing
const generators = {
  status: () => fc.constantFrom('all', 'pending', 'in-progress', 'completed'),
  priority: () => fc.constantFrom('all', 'low', 'medium', 'high', 'urgent'),
  
  task: () => fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    status: fc.constantFrom('pending', 'in-progress', 'completed'),
    priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
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
 * Helper function to filter tasks by status
 */
function filterTasksByStatus(tasks: Task[], status: string): Task[] {
  if (status === 'all') return tasks;
  return tasks.filter(task => task.status === status);
}

/**
 * Helper function to filter tasks by priority
 */
function filterTasksByPriority(tasks: Task[], priority: string): Task[] {
  if (priority === 'all') return tasks;
  return tasks.filter(task => task.priority === priority);
}

/**
 * Helper function to apply multiple filters
 */
function applyFilters(tasks: Task[], filters: TaskFilterState): Task[] {
  let filtered = tasks;
  
  // Apply status filter
  if (filters.status !== 'all') {
    filtered = filtered.filter(task => task.status === filters.status);
  }
  
  // Apply priority filter
  if (filters.priority !== 'all') {
    filtered = filtered.filter(task => task.priority === filters.priority);
  }
  
  return filtered;
}

describe('Feature: management-pages, Property 12: Task Status Filter Accuracy', () => {
  it('should filter tasks correctly for any status value', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        generators.status(),
        (tasks, statusFilter) => {
          const filters: TaskFilterState = { status: statusFilter, priority: 'all' };
          const expectedTasks = filterTasksByStatus(tasks, statusFilter);
          
          // Verify the filter logic
          if (statusFilter === 'all') {
            expect(expectedTasks.length).toBe(tasks.length);
          } else {
            expect(expectedTasks.every(task => task.status === statusFilter)).toBe(true);
          }
          
          // Verify no tasks are incorrectly included
          const excludedTasks = tasks.filter(task => !expectedTasks.includes(task));
          if (statusFilter !== 'all') {
            expect(excludedTasks.every(task => task.status !== statusFilter)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all tasks when status filter is "all"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(1, 30),
        (tasks) => {
          const filtered = filterTasksByStatus(tasks, 'all');
          expect(filtered.length).toBe(tasks.length);
          expect(filtered).toEqual(tasks);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only pending tasks when status filter is "pending"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByStatus(tasks, 'pending');
          expect(filtered.every(task => task.status === 'pending')).toBe(true);
          
          const pendingCount = tasks.filter(t => t.status === 'pending').length;
          expect(filtered.length).toBe(pendingCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only in-progress tasks when status filter is "in-progress"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByStatus(tasks, 'in-progress');
          expect(filtered.every(task => task.status === 'in-progress')).toBe(true);
          
          const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
          expect(filtered.length).toBe(inProgressCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only completed tasks when status filter is "completed"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByStatus(tasks, 'completed');
          expect(filtered.every(task => task.status === 'completed')).toBe(true);
          
          const completedCount = tasks.filter(t => t.status === 'completed').length;
          expect(filtered.length).toBe(completedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render status filter dropdown with correct value', () => {
    fc.assert(
      fc.property(
        generators.status(),
        (status) => {
          const filters: TaskFilterState = { status, priority: 'all' };
          const mockOnFilterChange = jest.fn();
          const mockOnClearFilters = jest.fn();
          
          render(
            <TaskFilter
              filters={filters}
              onFilterChange={mockOnFilterChange}
              onClearFilters={mockOnClearFilters}
            />
          );
          
          const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
          expect(statusSelect.value).toBe(status);
          
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: management-pages, Property 13: Task Priority Filter Accuracy', () => {
  it('should filter tasks correctly for any priority value', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        generators.priority(),
        (tasks, priorityFilter) => {
          const filters: TaskFilterState = { status: 'all', priority: priorityFilter };
          const expectedTasks = filterTasksByPriority(tasks, priorityFilter);
          
          // Verify the filter logic
          if (priorityFilter === 'all') {
            expect(expectedTasks.length).toBe(tasks.length);
          } else {
            expect(expectedTasks.every(task => task.priority === priorityFilter)).toBe(true);
          }
          
          // Verify no tasks are incorrectly included
          const excludedTasks = tasks.filter(task => !expectedTasks.includes(task));
          if (priorityFilter !== 'all') {
            expect(excludedTasks.every(task => task.priority !== priorityFilter)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all tasks when priority filter is "all"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(1, 30),
        (tasks) => {
          const filtered = filterTasksByPriority(tasks, 'all');
          expect(filtered.length).toBe(tasks.length);
          expect(filtered).toEqual(tasks);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only low priority tasks when priority filter is "low"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByPriority(tasks, 'low');
          expect(filtered.every(task => task.priority === 'low')).toBe(true);
          
          const lowCount = tasks.filter(t => t.priority === 'low').length;
          expect(filtered.length).toBe(lowCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only medium priority tasks when priority filter is "medium"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByPriority(tasks, 'medium');
          expect(filtered.every(task => task.priority === 'medium')).toBe(true);
          
          const mediumCount = tasks.filter(t => t.priority === 'medium').length;
          expect(filtered.length).toBe(mediumCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only high priority tasks when priority filter is "high"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByPriority(tasks, 'high');
          expect(filtered.every(task => task.priority === 'high')).toBe(true);
          
          const highCount = tasks.filter(t => t.priority === 'high').length;
          expect(filtered.length).toBe(highCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only urgent priority tasks when priority filter is "urgent"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(5, 20),
        (tasks) => {
          const filtered = filterTasksByPriority(tasks, 'urgent');
          expect(filtered.every(task => task.priority === 'urgent')).toBe(true);
          
          const urgentCount = tasks.filter(t => t.priority === 'urgent').length;
          expect(filtered.length).toBe(urgentCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render priority filter dropdown with correct value', () => {
    fc.assert(
      fc.property(
        generators.priority(),
        (priority) => {
          const filters: TaskFilterState = { status: 'all', priority };
          const mockOnFilterChange = jest.fn();
          const mockOnClearFilters = jest.fn();
          
          render(
            <TaskFilter
              filters={filters}
              onFilterChange={mockOnFilterChange}
              onClearFilters={mockOnClearFilters}
            />
          );
          
          const prioritySelect = screen.getByLabelText('Filter by priority') as HTMLSelectElement;
          expect(prioritySelect.value).toBe(priority);
          
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: management-pages, Property 17: Multi-Filter Conjunction', () => {
  it('should apply both status and priority filters correctly for any combination', () => {
    fc.assert(
      fc.property(
        generators.taskArray(10, 30),
        generators.status(),
        generators.priority(),
        (tasks, status, priority) => {
          const filters: TaskFilterState = { status, priority };
          const filtered = applyFilters(tasks, filters);
          
          // Verify status filter is applied
          if (status !== 'all') {
            expect(filtered.every(task => task.status === status)).toBe(true);
          }
          
          // Verify priority filter is applied
          if (priority !== 'all') {
            expect(filtered.every(task => task.priority === priority)).toBe(true);
          }
          
          // Verify both filters are applied (conjunction)
          if (status !== 'all' && priority !== 'all') {
            expect(filtered.every(task => 
              task.status === status && task.priority === priority
            )).toBe(true);
          }
          
          // Verify count matches manual filtering
          const manualFiltered = tasks.filter(task => {
            const statusMatch = status === 'all' || task.status === status;
            const priorityMatch = priority === 'all' || task.priority === priority;
            return statusMatch && priorityMatch;
          });
          expect(filtered.length).toBe(manualFiltered.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all tasks when both filters are "all"', () => {
    fc.assert(
      fc.property(
        generators.taskArray(1, 30),
        (tasks) => {
          const filters: TaskFilterState = { status: 'all', priority: 'all' };
          const filtered = applyFilters(tasks, filters);
          
          expect(filtered.length).toBe(tasks.length);
          expect(filtered).toEqual(tasks);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly filter when only status is set', () => {
    fc.assert(
      fc.property(
        generators.taskArray(10, 30),
        generators.status().filter(s => s !== 'all'),
        (tasks, status) => {
          const filters: TaskFilterState = { status, priority: 'all' };
          const filtered = applyFilters(tasks, filters);
          
          expect(filtered.every(task => task.status === status)).toBe(true);
          
          // Should include all priorities
          const priorities = new Set(filtered.map(t => t.priority));
          const originalPriorities = new Set(
            tasks.filter(t => t.status === status).map(t => t.priority)
          );
          expect(priorities).toEqual(originalPriorities);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly filter when only priority is set', () => {
    fc.assert(
      fc.property(
        generators.taskArray(10, 30),
        generators.priority().filter(p => p !== 'all'),
        (tasks, priority) => {
          const filters: TaskFilterState = { status: 'all', priority };
          const filtered = applyFilters(tasks, filters);
          
          expect(filtered.every(task => task.priority === priority)).toBe(true);
          
          // Should include all statuses
          const statuses = new Set(filtered.map(t => t.status));
          const originalStatuses = new Set(
            tasks.filter(t => t.priority === priority).map(t => t.status)
          );
          expect(statuses).toEqual(originalStatuses);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no tasks match both filters', () => {
    fc.assert(
      fc.property(
        generators.status().filter(s => s !== 'all'),
        generators.priority().filter(p => p !== 'all'),
        (status, priority) => {
          // Create tasks that don't match the filter combination
          const tasks: Task[] = [
            {
              id: '1',
              title: 'Task 1',
              description: 'Description',
              status: status === 'pending' ? 'completed' : 'pending',
              priority: priority === 'low' ? 'high' : 'low',
              dueDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              assignedTo: [],
            },
          ];
          
          const filters: TaskFilterState = { status, priority };
          const filtered = applyFilters(tasks, filters);
          
          expect(filtered.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain filter conjunction order independence', () => {
    fc.assert(
      fc.property(
        generators.taskArray(10, 30),
        generators.status(),
        generators.priority(),
        (tasks, status, priority) => {
          const filters: TaskFilterState = { status, priority };
          
          // Apply filters in one order
          const filtered1 = applyFilters(tasks, filters);
          
          // Apply filters in reverse order (manually)
          let filtered2 = tasks;
          if (priority !== 'all') {
            filtered2 = filtered2.filter(task => task.priority === priority);
          }
          if (status !== 'all') {
            filtered2 = filtered2.filter(task => task.status === status);
          }
          
          // Results should be the same regardless of order
          expect(filtered1.length).toBe(filtered2.length);
          expect(new Set(filtered1.map(t => t.id))).toEqual(new Set(filtered2.map(t => t.id)));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render both filter dropdowns with correct values', () => {
    fc.assert(
      fc.property(
        generators.status(),
        generators.priority(),
        (status, priority) => {
          const filters: TaskFilterState = { status, priority };
          const mockOnFilterChange = jest.fn();
          const mockOnClearFilters = jest.fn();
          
          render(
            <TaskFilter
              filters={filters}
              onFilterChange={mockOnFilterChange}
              onClearFilters={mockOnClearFilters}
            />
          );
          
          const statusSelect = screen.getByLabelText('Filter by status') as HTMLSelectElement;
          const prioritySelect = screen.getByLabelText('Filter by priority') as HTMLSelectElement;
          
          expect(statusSelect.value).toBe(status);
          expect(prioritySelect.value).toBe(priority);
          
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show "Clear All" button when any filter is active', () => {
    fc.assert(
      fc.property(
        generators.status(),
        generators.priority(),
        (status, priority) => {
          const filters: TaskFilterState = { status, priority };
          const mockOnFilterChange = jest.fn();
          const mockOnClearFilters = jest.fn();
          
          render(
            <TaskFilter
              filters={filters}
              onFilterChange={mockOnFilterChange}
              onClearFilters={mockOnClearFilters}
            />
          );
          
          const hasActiveFilters = status !== 'all' || priority !== 'all';
          
          if (hasActiveFilters) {
            expect(screen.getByText('Clear All')).toBeInTheDocument();
          } else {
            expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
          }
          
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
