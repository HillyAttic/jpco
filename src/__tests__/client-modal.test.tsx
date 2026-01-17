/**
 * Property-Based Tests for ClientModal
 * Feature: management-pages
 * 
 * This file contains property-based tests for ClientModal component:
 * - Property 2: Update Operation Consistency
 * - Property 8: Validation Error Clearing
 * - Property 9: Form State Preservation
 * 
 * Validates: Requirements 1.5, 6.5, 6.6
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { ClientModal } from '@/components/clients/ClientModal';
import { Client } from '@/services/client.service';

// Mock handlers for component props
const mockHandlers = {
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

// Helper function to wait for dialog to be interactive
const waitForDialogReady = async () => {
  await waitFor(() => {
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Ensure dialog doesn't have pointer-events: none
    const style = window.getComputedStyle(dialog);
    expect(style.pointerEvents).not.toBe('none');
  }, { timeout: 5000 });
};

// Reusable generators with proper validation
const generators = {
  name: () => fc.stringMatching(/^[A-Za-z]{2,25}( [A-Za-z]{2,25})?$/),
  phone: () => fc.stringMatching(/^\+?[0-9]{10,15}$/),
  company: () => fc.stringMatching(/^[A-Za-z]{2,20}( [A-Za-z]{2,20})?$/),
  invalidEmail: () => fc.stringMatching(/^[a-z]{3,10}$/), // No @ symbol
  invalidPhone: () => fc.stringMatching(/^[a-z]{5,10}$/), // Letters instead of numbers
};

// Set timeout for property-based tests
jest.setTimeout(60000);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ============================================================================
// Property 2: Update Operation Consistency
// Test edit form pre-populates data
// Validates: Requirements 1.5
// ============================================================================

describe('Feature: management-pages, Property 2: Update Operation Consistency', () => {
  it('should pre-populate all form fields with client data when editing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        async (clientData) => {
          const client: Client = {
            ...clientData,
            avatarUrl: undefined,
          };

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={client}
            />
          );

          // Wait for form to be populated
          await waitFor(() => {
            // Verify name field is pre-populated
            const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
            expect(nameInput.value).toBe(client.name);

            // Verify email field is pre-populated
            const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
            expect(emailInput.value).toBe(client.email);

            // Verify phone field is pre-populated
            const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
            expect(phoneInput.value).toBe(client.phone);

            // Verify company field is pre-populated
            const companyInput = screen.getByLabelText(/company/i) as HTMLInputElement;
            expect(companyInput.value).toBe(client.company);

            // Verify status field is pre-populated
            const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
            expect(statusSelect.value).toBe(client.status);
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should display "Edit Client" title when client is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        async (clientData) => {
          const client: Client = {
            ...clientData,
            avatarUrl: undefined,
          };

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={client}
            />
          );

          await waitFor(() => {
            expect(screen.getByText('Edit Client')).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should display "Create New Client" title when no client is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitFor(() => {
            expect(screen.getByText('Create New Client')).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve avatar URL when editing client with avatar', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          avatarUrl: fc.webUrl(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        async (client) => {
          const { container } = render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={client}
            />
          );

          await waitFor(() => {
            // Check that avatar preview is displayed
            const avatarImg = container.querySelector('img[alt="Avatar preview"]');
            expect(avatarImg).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 8: Validation Error Clearing
// Test errors clear when corrected
// Validates: Requirements 6.6
// ============================================================================

describe('Feature: management-pages, Property 8: Validation Error Clearing', () => {
  it('should clear email validation error when user enters valid email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          invalidEmail: generators.invalidEmail(),
          validEmail: fc.emailAddress(),
        }),
        async ({ invalidEmail, validEmail }) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in required fields first
          const nameInput = screen.getByLabelText(/full name/i);
          await user.type(nameInput, 'John Doe');

          const phoneInput = screen.getByLabelText(/phone/i);
          await user.type(phoneInput, '1234567890');

          const companyInput = screen.getByLabelText(/company/i);
          await user.type(companyInput, 'Test Company');

          // Enter invalid email
          const emailInput = screen.getByLabelText(/email/i);
          await user.type(emailInput, invalidEmail);

          // Try to submit to trigger validation
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error to appear with longer timeout
          await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
          }, { timeout: 5000 });

          // Clear the invalid email and enter valid email
          await user.clear(emailInput);
          await user.type(emailInput, validEmail);

          // Wait for error to clear
          await waitFor(() => {
            expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
          }, { timeout: 5000 });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should clear phone validation error when user enters valid phone', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          invalidPhone: generators.invalidPhone(),
          validPhone: generators.phone(),
        }),
        async ({ invalidPhone, validPhone }) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in required fields first
          const nameInput = screen.getByLabelText(/full name/i);
          await user.type(nameInput, 'John Doe');

          const emailInput = screen.getByLabelText(/email/i);
          await user.type(emailInput, 'test@example.com');

          const companyInput = screen.getByLabelText(/company/i);
          await user.type(companyInput, 'Test Company');

          // Enter invalid phone
          const phoneInput = screen.getByLabelText(/phone/i);
          await user.type(phoneInput, invalidPhone);

          // Try to submit to trigger validation
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error to appear
          await waitFor(() => {
            expect(screen.getByText(/invalid phone format/i)).toBeInTheDocument();
          });

          // Clear the invalid phone and enter valid phone
          await user.clear(phoneInput);
          await user.type(phoneInput, validPhone);

          // Wait for error to clear
          await waitFor(() => {
            expect(screen.queryByText(/invalid phone format/i)).not.toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should clear name validation error when user enters valid name', async () => {
    await fc.assert(
      fc.asyncProperty(
        generators.name(),
        async (validName) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in other required fields
          const emailInput = screen.getByLabelText(/email/i);
          await user.type(emailInput, 'test@example.com');

          const phoneInput = screen.getByLabelText(/phone/i);
          await user.type(phoneInput, '1234567890');

          const companyInput = screen.getByLabelText(/company/i);
          await user.type(companyInput, 'Test Company');

          // Leave name empty and try to submit
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error to appear
          await waitFor(() => {
            expect(screen.getByText(/name is required/i)).toBeInTheDocument();
          });

          // Enter valid name
          const nameInput = screen.getByLabelText(/full name/i);
          await user.type(nameInput, validName);

          // Wait for error to clear
          await waitFor(() => {
            expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should clear company validation error when user enters valid company', async () => {
    await fc.assert(
      fc.asyncProperty(
        generators.company(),
        async (validCompany) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in other required fields
          const nameInput = screen.getByLabelText(/full name/i);
          await user.type(nameInput, 'John Doe');

          const emailInput = screen.getByLabelText(/email/i);
          await user.type(emailInput, 'test@example.com');

          const phoneInput = screen.getByLabelText(/phone/i);
          await user.type(phoneInput, '1234567890');

          // Leave company empty and try to submit
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error to appear
          await waitFor(() => {
            expect(screen.getByText(/company is required/i)).toBeInTheDocument();
          });

          // Enter valid company
          const companyInput = screen.getByLabelText(/company/i);
          await user.type(companyInput, validCompany);

          // Wait for error to clear
          await waitFor(() => {
            expect(screen.queryByText(/company is required/i)).not.toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 9: Form State Preservation
// Test form preserves input on validation failure
// Validates: Requirements 6.5
// ============================================================================

describe('Feature: management-pages, Property 9: Form State Preservation', () => {
  it('should preserve all valid inputs when validation fails on one field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: generators.name(),
          invalidEmail: generators.invalidEmail(),
          phone: generators.phone(),
          company: generators.company(),
        }),
        async ({ name, invalidEmail, phone, company }) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in all fields with one invalid email
          const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
          await user.type(nameInput, name);

          const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
          await user.type(emailInput, invalidEmail);

          const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
          await user.type(phoneInput, phone);

          const companyInput = screen.getByLabelText(/company/i) as HTMLInputElement;
          await user.type(companyInput, company);

          // Try to submit to trigger validation
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error
          await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
          });

          // Verify all other fields still have their values
          expect(nameInput.value).toBe(name);
          expect(emailInput.value).toBe(invalidEmail);
          expect(phoneInput.value).toBe(phone);
          expect(companyInput.value).toBe(company);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve inputs when multiple validation errors occur', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: generators.name(),
          invalidEmail: generators.invalidEmail(),
          invalidPhone: generators.invalidPhone(),
          company: generators.company(),
        }),
        async ({ name, invalidEmail, invalidPhone, company }) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in fields with multiple invalid values
          const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
          await user.type(nameInput, name);

          const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
          await user.type(emailInput, invalidEmail);

          const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
          await user.type(phoneInput, invalidPhone);

          const companyInput = screen.getByLabelText(/company/i) as HTMLInputElement;
          await user.type(companyInput, company);

          // Try to submit to trigger validation
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation errors
          await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
            expect(screen.getByText(/invalid phone format/i)).toBeInTheDocument();
          });

          // Verify all fields still have their values
          expect(nameInput.value).toBe(name);
          expect(emailInput.value).toBe(invalidEmail);
          expect(phoneInput.value).toBe(invalidPhone);
          expect(companyInput.value).toBe(company);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not submit form when validation fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: generators.name(),
          invalidEmail: generators.invalidEmail(),
          phone: generators.phone(),
          company: generators.company(),
        }),
        async ({ name, invalidEmail, phone, company }) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });
          const mockSubmit = jest.fn();

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in fields with invalid email
          await user.type(screen.getByLabelText(/full name/i), name);
          await user.type(screen.getByLabelText(/email/i), invalidEmail);
          await user.type(screen.getByLabelText(/phone/i), phone);
          await user.type(screen.getByLabelText(/company/i), company);

          // Try to submit
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error
          await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
          });

          // Verify onSubmit was not called
          expect(mockSubmit).not.toHaveBeenCalled();

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve status selection when validation fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          invalidEmail: generators.invalidEmail(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
        }),
        async ({ invalidEmail, phone, company, status }) => {
          const user = userEvent.setup({ pointerEventsCheck: 0 });

          render(
            <ClientModal
              isOpen={true}
              onClose={mockHandlers.onClose}
              onSubmit={mockHandlers.onSubmit}
              client={null}
            />
          );

          await waitForDialogReady();

          // Fill in fields
          await user.type(screen.getByLabelText(/full name/i), 'John Doe');
          await user.type(screen.getByLabelText(/email/i), invalidEmail);
          await user.type(screen.getByLabelText(/phone/i), phone);
          await user.type(screen.getByLabelText(/company/i), company);

          // Select status
          const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
          await user.selectOptions(statusSelect, status);

          // Try to submit
          const submitButton = screen.getByRole('button', { name: /create client/i });
          await user.click(submitButton);

          // Wait for validation error
          await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
          });

          // Verify status is still selected
          expect(statusSelect.value).toBe(status);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});
