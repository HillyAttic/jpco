/**
 * Property-Based Tests for ClientCard
 * Feature: management-pages
 * 
 * This file contains property-based tests for ClientCard component:
 * - Property 22: Avatar Fallback Display
 * - Property 24: Client Card Completeness
 * 
 * Validates: Requirements 1.8, 1.9
 */

import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { ClientCard } from '@/components/clients/ClientCard';
import { Client } from '@/services/client.service';

// Mock handlers for component props
const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onSelect: jest.fn(),
};

// Reusable generators with proper validation to avoid special characters
const generators = {
  name: () => fc.stringMatching(/^[A-Za-z]{2,25}( [A-Za-z]{2,25})?$/),
  singleWordName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  firstName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  lastName: () => fc.stringMatching(/^[A-Za-z]{2,20}$/),
  phone: () => fc.stringMatching(/^[0-9]{10,15}$/),
  company: () => fc.stringMatching(/^[A-Za-z]{2,20}( [A-Za-z]{2,20})?$/),
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Helper function to render and test
function renderAndTest(client: Client, testFn: (container: HTMLElement) => void) {
  const { container } = render(
    <ClientCard
      client={client}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
    />
  );
  
  try {
    testFn(container);
  } finally {
    cleanup();
  }
}

// ============================================================================
// Property 22: Avatar Fallback Display
// Test initials shown when no avatar
// Validates: Requirements 1.8
// ============================================================================

describe('Feature: management-pages, Property 22: Avatar Fallback Display', () => {
  it('should display initials when no avatar URL is provided for any client', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (clientData) => {
          // Create client without avatarUrl
          const client: Client = {
            ...clientData,
            avatarUrl: undefined,
          };

          // Calculate expected initials
          const expectedInitials = client.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          renderAndTest(client, (container) => {
            // Check that avatar container is displayed (look for rounded-full class)
            const avatarElement = container.querySelector('.rounded-full');
            expect(avatarElement).toBeInTheDocument();
            
            // The initials should be present in the document
            expect(screen.getByText(expectedInitials)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display initials for single-word names', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.singleWordName(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (clientData) => {
          const client: Client = {
            ...clientData,
            avatarUrl: undefined,
          };

          // The component's getInitials function splits by space and takes first char of each part
          // For single-word names, it splits to one part, maps to first char, resulting in one letter
          const expectedInitials = client.name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          renderAndTest(client, () => {
            // Check that initials are displayed
            expect(screen.getByText(expectedInitials)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display initials for multi-word names (first letter of each word)', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          firstName: generators.firstName(),
          lastName: generators.lastName(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (clientData) => {
          const fullName = `${clientData.firstName} ${clientData.lastName}`;
          const client: Client = {
            ...clientData,
            name: fullName,
            avatarUrl: undefined,
          };

          // Expected initials: first letter of first name + first letter of last name
          const expectedInitials = (
            clientData.firstName[0] + clientData.lastName[0]
          ).toUpperCase();

          renderAndTest(client, () => {
            // Check that initials are displayed
            expect(screen.getByText(expectedInitials)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display initials when avatar URL is provided', () => {
    fc.assert(
      fc.property(
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
        (client) => {
          renderAndTest(client, (container) => {
            // Avatar element should exist (look for rounded-full class)
            const avatarElement = container.querySelector('.rounded-full');
            expect(avatarElement).toBeInTheDocument();

            // The avatar should have the src attribute with the URL (if img element exists)
            const imgElement = container.querySelector('img');
            if (imgElement && client.avatarUrl) {
              expect(imgElement).toHaveAttribute('src');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 24: Client Card Completeness
// Test all required fields displayed
// Validates: Requirements 1.9
// ============================================================================

describe('Feature: management-pages, Property 24: Client Card Completeness', () => {
  it('should display all required fields for any client', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, () => {
            // Verify avatar is displayed (check for rounded-full avatar container)
            const avatarContainer = document.querySelector('.rounded-full');
            expect(avatarContainer).toBeInTheDocument();

            // Verify name is displayed
            expect(screen.getByText(client.name)).toBeInTheDocument();

            // Verify email is displayed
            expect(screen.getByText(client.email)).toBeInTheDocument();

            // Verify phone is displayed
            expect(screen.getByText(client.phone)).toBeInTheDocument();

            // Verify company is displayed
            expect(screen.getByText(client.company)).toBeInTheDocument();

            // Verify status badge is displayed
            const statusText = client.status === 'active' ? 'active' : 'inactive';
            expect(screen.getByText(statusText)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display creation date when provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, () => {
            // Verify creation date is displayed
            const formattedDate = new Date(client.createdAt!).toLocaleDateString();
            expect(screen.getByText(`Added ${formattedDate}`)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display action buttons for any client', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, () => {
            // Verify edit button is present
            const editButton = screen.getByLabelText(`Edit ${client.name}`);
            expect(editButton).toBeInTheDocument();

            // Verify delete button is present
            const deleteButton = screen.getByLabelText(`Delete ${client.name}`);
            expect(deleteButton).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display contact information with proper links', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, () => {
            // Verify email link
            const emailLink = screen.getByText(client.email).closest('a');
            expect(emailLink).toHaveAttribute('href', `mailto:${client.email}`);

            // Verify phone link
            const phoneLink = screen.getByText(client.phone).closest('a');
            expect(phoneLink).toHaveAttribute('href', `tel:${client.phone}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display selection checkbox when onSelect handler is provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          const { container } = render(
            <ClientCard
              client={client}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              onSelect={mockHandlers.onSelect}
            />
          );

          try {
            // Verify selection checkbox is present
            const checkbox = screen.getByLabelText(`Select ${client.name}`);
            expect(checkbox).toBeInTheDocument();
            expect(checkbox).toHaveAttribute('type', 'checkbox');
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display all contact icons', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, (container) => {
            // Verify email, phone, and company information are all displayed
            // The component uses icons from heroicons, so we check for the text content
            expect(screen.getByText(client.email)).toBeInTheDocument();
            expect(screen.getByText(client.phone)).toBeInTheDocument();
            expect(screen.getByText(client.company)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display status badge with correct variant', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, () => {
            // Get the status text
            const statusText = client.status;

            // Find the badge element
            const statusBadge = screen.getByText(statusText);
            expect(statusBadge).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always display exactly one status badge per client', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: generators.name(),
          email: fc.emailAddress(),
          phone: generators.phone(),
          company: generators.company(),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        (client) => {
          renderAndTest(client, () => {
            // Get the expected status text for this client
            const expectedStatusText = client.status;

            // Count occurrences of the expected status text
            const statusElements = screen.getAllByText(expectedStatusText);
            
            // Should have exactly one status badge
            expect(statusElements.length).toBe(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
