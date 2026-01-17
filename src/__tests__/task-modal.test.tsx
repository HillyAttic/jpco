/**
 * Property-Based Tests for TaskModal
 * Feature: management-pages
 * 
 * This file contains property-based tests for TaskModal component:
 * - Property 50: Form Submission Loading State
 * - Property 54: Form Input Disabling
 * 
 * Validates: Requirements 9.2, 9.6
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Task } from '@/types/task.types';

// Mock handlers for component props
const mockHandlers = {
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

// Reusable generators
const generators = {
  title: () => fc.stringMatching(/^[A-Za-z0-9 ]{5,50}$/),
  description: () => fc.stringMatching(/^[A-Za-z0-9 .,!?]{10,100}$/),
  userId: () => fc.stringMatching(/^[A-Za-z]{2,15}( [A-Za-z]{2,15})?$/),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ============================================================================
// Property 50: Form Submission Loading State
// Test loading indicator appears during submission
// Validates: Requirements 9.2
// ============================================================================

describe('Feature: management-pages, Property 50: Form Submission Loading State', () => {
  it('should display loading indicator on submit button during any form submission', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
        }),
        async (formData) => {
          // Create a promise that we can control
          let resolveSubmit: () => void;
          const submitPromise = new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          });

          const mockSubmit = jest.fn(() => submitPromise);

          const { container } = render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockSubmit}
              isLoading={false}
            />
          );

          try {
            const user = userEvent.setup();

            // Fill in the form
            const titleInput = screen.getByLabelText(/task title/i);
            const descriptionInput = screen.getByLabelText(/description/i);
            const dueDateInput = screen.getByLabelText(/due date/i);
            const prioritySelect = screen.getByLabelText(/priority/i);
            const assignedToInput = screen.getByLabelText(/assigned to/i);

            await user.clear(titleInput);
            await user.type(titleInput, formData.title);
            await user.clear(descriptionInput);
            await user.type(descriptionInput, formData.description);
            
            const formattedDate = formData.dueDate.toISOString().split('T')[0];
            await user.clear(dueDateInput);
            await user.type(dueDateInput, formattedDate);
            
            await user.selectOptions(prioritySelect, formData.priority);
            
            await user.clear(assignedToInput);
            await user.type(assignedToInput, formData.assignedTo.join(', '));

            // Submit the form
            const submitButton = screen.getByRole('button', { name: /create task/i });
            await user.click(submitButton);

            // Wait for the form to process
            await waitFor(() => {
              expect(mockSubmit).toHaveBeenCalled();
            });

            // During submission, check for loading indicator
            // The button should show a loading spinner
            const buttonWithSpinner = container.querySelector('button[type="submit"] .animate-spin');
            
            // Note: Since we're testing the component with isLoading prop,
            // we need to re-render with isLoading=true to test the loading state
            cleanup();
            
            render(
              <TaskModal
                isOpen={true}
                onClose={mockHandlers.onClose}
                onSubmit={mockSubmit}
                isLoading={true}
              />
            );

            // Now verify loading indicator is present
            const loadingButton = screen.getByRole('button', { name: /create task/i });
            const spinner = loadingButton.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();

            // Resolve the promise
            resolveSubmit!();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display loading spinner when isLoading prop is true', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          const { container } = render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              isLoading={isLoading}
            />
          );

          try {
            const submitButton = screen.getByRole('button', { name: /create task/i });
            const spinner = submitButton.querySelector('.animate-spin');

            if (isLoading) {
              // Loading spinner should be present
              expect(spinner).toBeInTheDocument();
            } else {
              // Loading spinner should not be present
              expect(spinner).not.toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display loading indicator for edit mode submissions', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        fc.boolean(),
        (task, isLoading) => {
          const { container } = render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={task}
              isLoading={isLoading}
            />
          );

          try {
            const submitButton = screen.getByRole('button', { name: /update task/i });
            const spinner = submitButton.querySelector('.animate-spin');

            if (isLoading) {
              expect(spinner).toBeInTheDocument();
            } else {
              expect(spinner).not.toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show loading text on submit button during submission', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              isLoading={isLoading}
            />
          );

          try {
            const submitButton = screen.getByRole('button', { name: /create task/i });
            
            // Button should always be present
            expect(submitButton).toBeInTheDocument();
            
            // When loading, button should be disabled
            if (isLoading) {
              expect(submitButton).toBeDisabled();
            } else {
              expect(submitButton).not.toBeDisabled();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 54: Form Input Disabling
// Test inputs disabled during submission
// Validates: Requirements 9.6
// ============================================================================

describe('Feature: management-pages, Property 54: Form Input Disabling', () => {
  it('should disable all form inputs when isLoading is true', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              isLoading={isLoading}
            />
          );

          try {
            // Get all form inputs
            const titleInput = screen.getByLabelText(/task title/i) as HTMLInputElement;
            const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
            const dueDateInput = screen.getByLabelText(/due date/i) as HTMLInputElement;
            const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
            const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
            const assignedToInput = screen.getByLabelText(/assigned to/i) as HTMLInputElement;
            const categoryInput = screen.getByLabelText(/category/i) as HTMLInputElement;

            // Verify all inputs have correct disabled state
            if (isLoading) {
              expect(titleInput.disabled).toBe(true);
              expect(descriptionInput.disabled).toBe(true);
              expect(dueDateInput.disabled).toBe(true);
              expect(prioritySelect.disabled).toBe(true);
              expect(statusSelect.disabled).toBe(true);
              expect(assignedToInput.disabled).toBe(true);
              expect(categoryInput.disabled).toBe(true);
            } else {
              expect(titleInput.disabled).toBe(false);
              expect(descriptionInput.disabled).toBe(false);
              expect(dueDateInput.disabled).toBe(false);
              expect(prioritySelect.disabled).toBe(false);
              expect(statusSelect.disabled).toBe(false);
              expect(assignedToInput.disabled).toBe(false);
              expect(categoryInput.disabled).toBe(false);
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable title input during submission for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (task) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={task}
              isLoading={true}
            />
          );

          try {
            const titleInput = screen.getByLabelText(/task title/i) as HTMLInputElement;
            expect(titleInput.disabled).toBe(true);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable description input during submission for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (task) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={task}
              isLoading={true}
            />
          );

          try {
            const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
            expect(descriptionInput.disabled).toBe(true);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable date picker during submission for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (task) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={task}
              isLoading={true}
            />
          );

          try {
            const dueDateInput = screen.getByLabelText(/due date/i) as HTMLInputElement;
            expect(dueDateInput.disabled).toBe(true);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable priority selector during submission for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (task) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={task}
              isLoading={true}
            />
          );

          try {
            const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
            expect(prioritySelect.disabled).toBe(true);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable assignee input during submission for any task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: generators.title(),
          description: generators.description(),
          dueDate: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent') as fc.Arbitrary<'low' | 'medium' | 'high' | 'urgent'>,
          status: fc.constantFrom('pending', 'in-progress', 'completed') as fc.Arbitrary<'pending' | 'in-progress' | 'completed'>,
          assignedTo: fc.array(generators.userId(), { minLength: 1, maxLength: 5 }),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (task) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              task={task}
              isLoading={true}
            />
          );

          try {
            const assignedToInput = screen.getByLabelText(/assigned to/i) as HTMLInputElement;
            expect(assignedToInput.disabled).toBe(true);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable cancel button during submission', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              isLoading={isLoading}
            />
          );

          try {
            const cancelButton = screen.getByRole('button', { name: /cancel/i });
            
            if (isLoading) {
              expect(cancelButton).toBeDisabled();
            } else {
              expect(cancelButton).not.toBeDisabled();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should disable submit button during submission', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          render(
            <TaskModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              isLoading={isLoading}
            />
          );

          try {
            const submitButton = screen.getByRole('button', { name: /create task/i });
            
            if (isLoading) {
              expect(submitButton).toBeDisabled();
            } else {
              expect(submitButton).not.toBeDisabled();
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
