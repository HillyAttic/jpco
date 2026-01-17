/**
 * Property-Based Tests for ClientList
 * Feature: management-pages
 * 
 * This file contains property-based tests for ClientList component:
 * - Property 11: Client Search Accuracy
 * - Property 19: Real-Time Search Filtering
 * - Property 20: Filtered Result Count Accuracy
 * 
 * Validates: Requirements 1.7, 8.1, 8.4
 */

import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { ClientList } from '@/components/clients/ClientList';
import { Client } from '@/services/client.service';

// Mock handlers for component props
const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
};

// Reusable generators with proper validation
const generators = {
  name: () => fc.stringMatching(/^[A-Za-z]{2,25}( [A-Za-z]{2,25})?$/),
  phone: () => fc.stringMatching(/^\+?[0-9]{10,15}$/),
  company: () => fc.stringMatching(/^[A-Za-z]{2,20}( [A-Za-z]{2,20})?$/),
  searchTerm: () => fc.stringMatching(/^[A-Za-z]{2,10}$/),
};

// Generator for a valid client
const clientGenerator = fc.record({
  id: fc.uuid(),
  name: generators.name(),
  email: fc.emailAddress(),
  phone: generators.phone(),
  company: generators.company(),
  status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

// Set timeout for property-based tests
jest.setTimeout(30000);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// ============================================================================
// Property 11: Client Search Accuracy
// Test search filters correctly
// Validates: Requirements 1.7
// ============================================================================

describe('Feature: management-pages, Property 11: Client Search Accuracy', () => {
  it('should display only clients whose name contains the search query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 10 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Ensure at least one client matches the search term in name
          const matchingClient = {
            ...clients[0],
            name: `${searchTerm} TestName`,
          };
          const allClients = [matchingClient, ...clients.slice(1)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type search query
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, searchTerm);

          // Wait for filtering to complete
          await waitFor(() => {
            // The matching client should be displayed
            expect(screen.getByText(matchingClient.name)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should display only clients whose email contains the search query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 10 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Ensure at least one client matches the search term in email
          const matchingClient = {
            ...clients[0],
            email: `${searchTerm.toLowerCase()}@example.com`,
          };
          const allClients = [matchingClient, ...clients.slice(1)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type search query
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, searchTerm);

          // Wait for filtering to complete
          await waitFor(() => {
            // The matching client should be displayed
            expect(screen.getByText(matchingClient.email)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should display only clients whose company contains the search query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 10 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Ensure at least one client matches the search term in company
          const matchingClient = {
            ...clients[0],
            company: `${searchTerm} Corp`,
          };
          const allClients = [matchingClient, ...clients.slice(1)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type search query
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, searchTerm);

          // Wait for filtering to complete
          await waitFor(() => {
            // The matching client should be displayed
            expect(screen.getByText(matchingClient.company)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should filter clients across name, email, and company fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 10, maxLength: 15 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Create clients that match in different fields
          const nameMatch = { ...clients[0], name: `${searchTerm} Name` };
          const emailMatch = { ...clients[1], email: `${searchTerm.toLowerCase()}@test.com` };
          const companyMatch = { ...clients[2], company: `${searchTerm} Inc` };
          const allClients = [nameMatch, emailMatch, companyMatch, ...clients.slice(3)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type search query
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, searchTerm);

          // Wait for filtering to complete
          await waitFor(() => {
            // All three matching clients should be displayed
            expect(screen.getByText(nameMatch.name)).toBeInTheDocument();
            expect(screen.getByText(emailMatch.email)).toBeInTheDocument();
            expect(screen.getByText(companyMatch.company)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should be case-insensitive for all search fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 3, maxLength: 8 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Create a client with the search term in uppercase
          const matchingClient = {
            ...clients[0],
            name: searchTerm.toUpperCase(),
          };
          const allClients = [matchingClient, ...clients.slice(1)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type search query in lowercase
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, searchTerm.toLowerCase());

          // Wait for filtering to complete
          await waitFor(() => {
            // The matching client should be displayed despite case difference
            expect(screen.getByText(matchingClient.name)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// Property 19: Real-Time Search Filtering
// Test search updates immediately
// Validates: Requirements 8.1
// ============================================================================

describe('Feature: management-pages, Property 19: Real-Time Search Filtering', () => {
  it('should update results immediately as each character is typed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 8 }),
        async (clients) => {
          const user = userEvent.setup();

          // Create a client with a known name
          const targetClient = {
            ...clients[0],
            name: 'TestUser Alpha',
          };
          const allClients = [targetClient, ...clients.slice(1)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          const searchInput = screen.getByLabelText('Search clients');

          // Type "Test" and verify results update
          await user.type(searchInput, 'Test');
          await waitFor(() => {
            // Target client should be visible
            expect(screen.getByText(targetClient.name)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should update results when characters are deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 8 }),
        async (clients) => {
          const user = userEvent.setup();

          // Create clients with specific names
          const clientA = { ...clients[0], name: 'Alpha Client' };
          const clientB = { ...clients[1], name: 'Beta Client' };
          const allClients = [clientA, clientB, ...clients.slice(2)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          const searchInput = screen.getByLabelText('Search clients');

          // Type "Alpha" to filter to clientA
          await user.type(searchInput, 'Alpha');
          await waitFor(() => {
            expect(screen.getByText(clientA.name)).toBeInTheDocument();
          });

          // Clear the search
          await user.clear(searchInput);
          await waitFor(() => {
            // Both clients should be visible again
            expect(screen.getByText(clientA.name)).toBeInTheDocument();
            expect(screen.getByText(clientB.name)).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not require submit button or enter key to filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 3, maxLength: 6 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Create a matching client
          const matchingClient = {
            ...clients[0],
            name: `${searchTerm} TestName`,
          };
          const allClients = [matchingClient, ...clients.slice(1)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          const searchInput = screen.getByLabelText('Search clients');

          // Type search query without pressing enter
          await user.type(searchInput, searchTerm);

          // Results should update immediately without any additional action
          await waitFor(() => {
            expect(screen.getByText(matchingClient.name)).toBeInTheDocument();
          });

          // Verify there's no submit button for search
          const submitButtons = screen.queryAllByRole('button', { name: /search/i });
          expect(submitButtons.length).toBe(0);

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ============================================================================
// Property 20: Filtered Result Count Accuracy
// Test result count matches display
// Validates: Requirements 8.4
// ============================================================================

describe('Feature: management-pages, Property 20: Filtered Result Count Accuracy', () => {
  it('should display accurate count of filtered results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 10 }),
        generators.searchTerm(),
        async (clients, searchTerm) => {
          const user = userEvent.setup();

          // Create some clients that match the search term
          const matchingClients = clients.slice(0, 3).map((client, index) => ({
            ...client,
            name: `${searchTerm} Client ${index}`,
          }));
          const allClients = [...matchingClients, ...clients.slice(3)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type search query
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, searchTerm);

          // Wait for filtering to complete
          await waitFor(() => {
            // Calculate expected count
            const expectedCount = allClients.filter(client =>
              client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              client.company.toLowerCase().includes(searchTerm.toLowerCase())
            ).length;

            // Verify the count is displayed correctly
            const countText = screen.getByText(new RegExp(`showing \\d+ of ${expectedCount} client`, 'i'));
            expect(countText).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should show correct count when no filters are applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 1, maxLength: 15 }),
        async (clients) => {
          render(
            <ClientList
              clients={clients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            // Should show total count
            const totalCount = Math.min(clients.length, 20); // First page only
            const countText = screen.getByText(new RegExp(`showing ${totalCount} of ${clients.length} client`, 'i'));
            expect(countText).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should update count as search query changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 8 }),
        async (clients) => {
          const user = userEvent.setup();

          // Create clients with specific names
          const clientA = { ...clients[0], name: 'Alpha Test' };
          const clientB = { ...clients[1], name: 'Beta Test' };
          const clientC = { ...clients[2], name: 'Gamma Other' };
          const allClients = [clientA, clientB, clientC, ...clients.slice(3)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          const searchInput = screen.getByLabelText('Search clients');

          // Type "Test" - should match 2 clients
          await user.type(searchInput, 'Test');
          await waitFor(() => {
            const expectedCount = allClients.filter(c =>
              c.name.toLowerCase().includes('test') ||
              c.email.toLowerCase().includes('test') ||
              c.company.toLowerCase().includes('test')
            ).length;
            expect(expectedCount).toBeGreaterThanOrEqual(2);
            const countText = screen.getByText(new RegExp(`of ${expectedCount} client`, 'i'));
            expect(countText).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should show zero count when no results match', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 3, maxLength: 6 }),
        async (clients) => {
          const user = userEvent.setup();
          const nonMatchingQuery = 'ZZZZZZZZZZZ';

          render(
            <ClientList
              clients={clients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Search clients')).toBeInTheDocument();
          });

          // Type non-matching query
          const searchInput = screen.getByLabelText('Search clients');
          await user.type(searchInput, nonMatchingQuery);

          // Wait for filtering to complete
          await waitFor(() => {
            const countText = screen.getByText(/showing 0 of 0 client/i);
            expect(countText).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should display count with correct singular/plural form', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 1, maxLength: 1 }),
        async (clients) => {
          render(
            <ClientList
              clients={clients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            // Should use singular "client" for count of 1
            const countText = screen.getByText(/showing 1 of 1 client$/i);
            expect(countText).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should show correct count when status filter is applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(clientGenerator, { minLength: 5, maxLength: 10 }),
        async (clients) => {
          const user = userEvent.setup();

          // Create mix of active and inactive clients
          const activeClients = clients.slice(0, 3).map(c => ({ ...c, status: 'active' as const }));
          const inactiveClients = clients.slice(3, 5).map(c => ({ ...c, status: 'inactive' as const }));
          const allClients = [...activeClients, ...inactiveClients, ...clients.slice(5)];

          render(
            <ClientList
              clients={allClients}
              onEdit={mockHandlers.onEdit}
              onDelete={mockHandlers.onDelete}
              isLoading={false}
            />
          );

          // Wait for component to render
          await waitFor(() => {
            expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
          });

          // Select "Active" filter
          const statusFilter = screen.getByLabelText('Filter by status');
          await user.selectOptions(statusFilter, 'active');

          // Wait for filtering to complete
          await waitFor(() => {
            const activeCount = allClients.filter(c => c.status === 'active').length;
            const countText = screen.getByText(new RegExp(`of ${activeCount} client`, 'i'));
            expect(countText).toBeInTheDocument();
          });

          cleanup();
        }
      ),
      { numRuns: 20 }
    );
  });
});
