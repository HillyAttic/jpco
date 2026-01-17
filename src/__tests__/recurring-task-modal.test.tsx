/**
 * Property-Based Tests for RecurringTaskModal
 * Feature: management-pages
 * 
 * This file contains property-based tests for RecurringTaskModal component:
 * - Property 36: Recurring Task Pattern Acceptance
 * - Property 41: Team Assignment Propagation
 * 
 * Validates: Requirements 3.2, 3.8
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { RecurringTaskModal } from '@/components/recurring-tasks/RecurringTaskModal';

// Mock handlers for component props
const mockHandlers = {
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHandlers.onSubmit.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

// Reusable generators
const generators = {
  title: () => fc.string({ minLength: 5, maxLength: 30 }).map(s => s.replace(/[^A-Za-z0-9 ]/g, 'A')),
  description: () => fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/[^A-Za-z0-9 ]/g, 'A')),
  userId: () => fc.string({ minLength: 5, maxLength: 15 }).map(s => s.replace(/[^A-Za-z]/g, 'A')),
  teamId: () => fc.uuid(),
};

// ============================================================================
// Property 36: Recurring Task Pattern Acceptance
// Test all patterns accepted
// Validates: Requirements 3.2
// ============================================================================

describe('Feature: management-pages, Property 36: Recurring Task Pattern Acceptance', () => {
  it('should accept and save any valid recurrence pattern (daily, weekly, monthly, quarterly)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
        }),
        async (taskData) => {
          const user = userEvent.setup();

          // Render the modal
          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Fill in required fields only
          const titleInput = screen.getByLabelText(/task title/i);
          await user.type(titleInput, taskData.title);

          const assignedToInput = screen.getByLabelText(/assigned to/i);
          await user.type(assignedToInput, taskData.assignedTo);

          // Select recurrence pattern
          const patternSelect = screen.getByLabelText(/recurrence pattern/i);
          await user.selectOptions(patternSelect, taskData.recurrencePattern);

          // Submit the form
          const submitButton = screen.getByRole('button', { name: /create recurring task/i });
          await user.click(submitButton);

          // Wait for submission
          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify the submitted data includes the recurrence pattern
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.recurrencePattern).toBe(taskData.recurrencePattern);
          expect(['daily', 'weekly', 'monthly', 'quarterly']).toContain(submittedData.recurrencePattern);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should accept daily recurrence pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Fill required fields
          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);

          // Select daily pattern
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), 'daily');

          // Submit
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.recurrencePattern).toBe('daily');

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should accept weekly recurrence pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), 'weekly');
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          expect(mockHandlers.onSubmit.mock.calls[0][0].recurrencePattern).toBe('weekly');

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should accept monthly recurrence pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), 'monthly');
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          expect(mockHandlers.onSubmit.mock.calls[0][0].recurrencePattern).toBe('monthly');

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should accept quarterly recurrence pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), 'quarterly');
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          expect(mockHandlers.onSubmit.mock.calls[0][0].recurrencePattern).toBe('quarterly');

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should validate and save recurrence pattern with all form data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          assignedTo: generators.userId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Fill form
          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), taskData.recurrencePattern);

          // Submit
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify pattern is in submitted data
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.recurrencePattern).toBe(taskData.recurrencePattern);
          expect(['daily', 'weekly', 'monthly', 'quarterly']).toContain(submittedData.recurrencePattern);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);
});

// ============================================================================
// Property 41: Team Assignment Propagation
// Test assignment applies to future
// Validates: Requirements 3.8
// ============================================================================

describe('Feature: management-pages, Property 41: Team Assignment Propagation', () => {
  it('should include team assignment in submitted data for any recurring task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          teamId: generators.teamId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Fill in required fields
          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), taskData.recurrencePattern);

          // Assign team
          const teamInput = screen.getByLabelText(/team assignment/i);
          await user.type(teamInput, taskData.teamId);

          // Submit
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify team assignment is included in submitted data
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.teamId).toBe(taskData.teamId);
          expect(submittedData.recurrencePattern).toBe(taskData.recurrencePattern);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should preserve team assignment when editing recurring task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          assignedTo: generators.userId(),
          teamId: generators.teamId(),
        }),
        async (testData) => {
          const user = userEvent.setup();

          const existingTask = {
            id: testData.id,
            title: testData.title,
            description: 'Test description',
            dueDate: new Date('2025-12-31'),
            priority: 'medium' as const,
            status: 'pending' as const,
            assignedTo: [testData.assignedTo],
            recurrencePattern: 'weekly' as const,
            nextOccurrence: new Date('2025-12-31'),
            startDate: new Date('2024-01-01'),
            completionHistory: [],
            isPaused: false,
            teamId: testData.teamId,
          };

          // Render modal in edit mode with existing task
          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={existingTask}
            />
          );

          // Wait for form to populate
          await waitFor(() => {
            expect(screen.getByLabelText(/task title/i)).toHaveValue(existingTask.title);
          }, { timeout: 5000 });

          // Verify team assignment is pre-populated
          const teamInput = screen.getByLabelText(/team assignment/i) as HTMLInputElement;
          expect(teamInput.value).toBe(existingTask.teamId);

          // Submit without changes
          await user.click(screen.getByRole('button', { name: /update recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify team assignment is preserved in submission
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.teamId).toBe(existingTask.teamId);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should allow updating team assignment for recurring task', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalTeamId: generators.teamId(),
          newTeamId: generators.teamId(),
          title: generators.title(),
          assignedTo: generators.userId(),
        }),
        async (testData) => {
          // Skip if team IDs are the same
          if (testData.originalTeamId === testData.newTeamId) {
            return true;
          }

          const user = userEvent.setup();

          const existingTask = {
            id: 'test-id',
            title: testData.title,
            description: 'Test description',
            dueDate: new Date('2025-12-31'),
            priority: 'medium' as const,
            status: 'pending' as const,
            assignedTo: [testData.assignedTo],
            recurrencePattern: 'weekly' as const,
            nextOccurrence: new Date('2025-12-31'),
            startDate: new Date('2024-01-01'),
            completionHistory: [],
            isPaused: false,
            teamId: testData.originalTeamId,
          };

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={existingTask}
            />
          );

          // Wait for form to populate
          await waitFor(() => {
            expect(screen.getByLabelText(/task title/i)).toHaveValue(existingTask.title);
          }, { timeout: 5000 });

          // Update team assignment
          const teamInput = screen.getByLabelText(/team assignment/i);
          await user.clear(teamInput);
          await user.type(teamInput, testData.newTeamId);

          // Submit
          await user.click(screen.getByRole('button', { name: /update recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify new team assignment is in submitted data
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.teamId).toBe(testData.newTeamId);
          expect(submittedData.teamId).not.toBe(testData.originalTeamId);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should allow creating recurring task without team assignment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Fill required fields without team assignment
          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), taskData.recurrencePattern);

          // Do NOT fill team assignment (it's optional)

          // Submit
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify submission succeeds without team assignment
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.title).toBe(taskData.title);
          expect(submittedData.recurrencePattern).toBe(taskData.recurrencePattern);
          // teamId should be empty string or undefined
          expect(submittedData.teamId === '' || submittedData.teamId === undefined).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  it('should display helper text indicating team assignment applies to future occurrences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Verify helper text is displayed
          expect(
            screen.getByText(/team assignment will apply to all future occurrences/i)
          ).toBeInTheDocument();

          cleanup();
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  it('should submit team assignment along with recurrence pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          assignedTo: generators.userId(),
          recurrencePattern: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly') as fc.Arbitrary<'daily' | 'weekly' | 'monthly' | 'quarterly'>,
          teamId: generators.teamId(),
        }),
        async (taskData) => {
          const user = userEvent.setup();

          render(
            <RecurringTaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={null}
            />
          );

          // Fill form with both recurrence pattern and team assignment
          await user.type(screen.getByLabelText(/task title/i), taskData.title);
          await user.type(screen.getByLabelText(/assigned to/i), taskData.assignedTo);
          await user.selectOptions(screen.getByLabelText(/recurrence pattern/i), taskData.recurrencePattern);
          await user.type(screen.getByLabelText(/team assignment/i), taskData.teamId);

          // Submit
          await user.click(screen.getByRole('button', { name: /create recurring task/i }));

          await waitFor(() => {
            expect(mockHandlers.onSubmit).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Verify both are in submitted data
          const submittedData = mockHandlers.onSubmit.mock.calls[0][0];
          expect(submittedData.recurrencePattern).toBe(taskData.recurrencePattern);
          expect(submittedData.teamId).toBe(taskData.teamId);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);
});
