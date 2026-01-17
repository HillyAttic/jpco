/**
 * Property-Based Tests for useClients Hook
 * Feature: management-pages
 * 
 * This file contains property-based tests for useClients hook optimistic updates:
 * - Property 51: Optimistic Create Display
 * - Property 52: Optimistic Delete Display
 * 
 * Validates: Requirements 9.3, 9.4
 */

import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClients } from '@/hooks/use-clients';

// Mock fetch globally
global.fetch = jest.fn();

// ============================================================================
// Property 51: Optimistic Create Display
// Test items appear immediately
// Validates: Requirements 9.3
// ============================================================================

describe('Feature: management-pages, Property 51: Optimistic Create Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should display new client immediately before server confirmation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
        }),
        async (clientData) => {
          // Mock initial empty fetch
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          }, { timeout: 3000 });

          const initialCount = result.current.clients.length;

          // Mock delayed server response to test optimistic update
          let resolveCreate: (value: any) => void;
          const createPromise = new Promise((resolve) => {
            resolveCreate = resolve;
          });

          (global.fetch as jest.Mock).mockReturnValueOnce(
            createPromise.then(() => ({
              ok: true,
              json: async () => ({
                id: fc.sample(fc.uuid(), 1)[0],
                ...clientData,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            }))
          );

          // Start create operation
          let createPromiseResult: Promise<void>;
          act(() => {
            createPromiseResult = result.current.createClient(clientData);
          });

          // Verify client appears immediately (optimistic update)
          await waitFor(() => {
            expect(result.current.clients.length).toBe(initialCount + 1);
          }, { timeout: 1000 });

          // Verify the optimistic client has the correct data
          const optimisticClient = result.current.clients[0];
          expect(optimisticClient.name).toBe(clientData.name);
          expect(optimisticClient.email).toBe(clientData.email);
          expect(optimisticClient.phone).toBe(clientData.phone);
          expect(optimisticClient.company).toBe(clientData.company);
          expect(optimisticClient.status).toBe(clientData.status);

          // Verify it has a temporary ID
          expect(optimisticClient.id).toMatch(/^temp-/);

          // Now resolve the server response
          resolveCreate!({
            ok: true,
            json: async () => ({
              id: fc.sample(fc.uuid(), 1)[0],
              ...clientData,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          });

          // Wait for the create to complete
          await act(async () => {
            await createPromiseResult!;
          });

          // Verify client is still displayed (now with real ID)
          await waitFor(() => {
            expect(result.current.clients.length).toBe(initialCount + 1);
            const finalClient = result.current.clients[0];
            expect(finalClient.id).not.toMatch(/^temp-/);
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should display multiple new clients immediately in sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (clientsData) => {
          // Mock initial empty fetch
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          }, { timeout: 3000 });

          const initialCount = result.current.clients.length;

          // Create multiple clients
          for (let i = 0; i < clientsData.length; i++) {
            const clientData = clientsData[i];

            // Mock successful server response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                id: fc.sample(fc.uuid(), 1)[0],
                ...clientData,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            });

            await act(async () => {
              await result.current.createClient(clientData);
            });

            // Verify client count increases immediately
            await waitFor(() => {
              expect(result.current.clients.length).toBe(initialCount + i + 1);
            }, { timeout: 3000 });
          }

          // Verify all clients are displayed
          expect(result.current.clients.length).toBe(initialCount + clientsData.length);

          // Verify all client data is correct
          clientsData.forEach((clientData, index) => {
            const client = result.current.clients.find(c => c.name === clientData.name);
            expect(client).toBeDefined();
            expect(client?.email).toBe(clientData.email);
            expect(client?.company).toBe(clientData.company);
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should preserve optimistic client data until server responds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
        }),
        async (clientData) => {
          // Mock initial empty fetch
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          }, { timeout: 3000 });

          // Mock delayed server response
          let resolveCreate: (value: any) => void;
          const createPromise = new Promise((resolve) => {
            resolveCreate = resolve;
          });

          (global.fetch as jest.Mock).mockReturnValueOnce(
            createPromise.then(() => ({
              ok: true,
              json: async () => ({
                id: fc.sample(fc.uuid(), 1)[0],
                ...clientData,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            }))
          );

          // Start create operation
          let createPromiseResult: Promise<void>;
          act(() => {
            createPromiseResult = result.current.createClient(clientData);
          });

          // Wait for optimistic update
          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 1000 });

          // Verify data is preserved while waiting for server
          const optimisticClient = result.current.clients[0];
          expect(optimisticClient.name).toBe(clientData.name);
          expect(optimisticClient.email).toBe(clientData.email);
          expect(optimisticClient.phone).toBe(clientData.phone);
          expect(optimisticClient.company).toBe(clientData.company);

          // Wait a bit to ensure data remains stable
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify data is still preserved
          const stillOptimisticClient = result.current.clients[0];
          expect(stillOptimisticClient.name).toBe(clientData.name);
          expect(stillOptimisticClient.email).toBe(clientData.email);

          // Now resolve the server response
          resolveCreate!({
            ok: true,
            json: async () => ({
              id: fc.sample(fc.uuid(), 1)[0],
              ...clientData,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          });

          await act(async () => {
            await createPromiseResult!;
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should add new client to the beginning of the list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
        }),
        async (existingClients, newClientData) => {
          // Mock initial fetch with existing clients
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: existingClients }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(existingClients.length);
          }, { timeout: 3000 });

          // Mock successful create
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: fc.sample(fc.uuid(), 1)[0],
              ...newClientData,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          });

          await act(async () => {
            await result.current.createClient(newClientData);
          });

          // Verify new client is at the beginning
          await waitFor(() => {
            expect(result.current.clients.length).toBe(existingClients.length + 1);
            const firstClient = result.current.clients[0];
            expect(firstClient.name).toBe(newClientData.name);
            expect(firstClient.email).toBe(newClientData.email);
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// ============================================================================
// Property 52: Optimistic Delete Display
// Test items removed immediately
// Validates: Requirements 9.4
// ============================================================================

describe('Feature: management-pages, Property 52: Optimistic Delete Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should remove client immediately before server confirmation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        }),
        async (client) => {
          // Mock initial fetch with client
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [client] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 3000 });

          // Mock delayed server response to test optimistic update
          let resolveDelete: (value: any) => void;
          const deletePromise = new Promise((resolve) => {
            resolveDelete = resolve;
          });

          (global.fetch as jest.Mock).mockReturnValueOnce(
            deletePromise.then(() => ({
              ok: true,
              json: async () => ({ message: 'Client deleted successfully' }),
            }))
          );

          // Start delete operation
          let deletePromiseResult: Promise<void>;
          act(() => {
            deletePromiseResult = result.current.deleteClient(client.id);
          });

          // Verify client is removed immediately (optimistic update)
          await waitFor(() => {
            expect(result.current.clients.length).toBe(0);
          }, { timeout: 1000 });

          // Verify the specific client is not in the list
          expect(result.current.clients.find(c => c.id === client.id)).toBeUndefined();

          // Now resolve the server response
          resolveDelete!({
            ok: true,
            json: async () => ({ message: 'Client deleted successfully' }),
          });

          // Wait for the delete to complete
          await act(async () => {
            await deletePromiseResult!;
          });

          // Verify client is still removed
          expect(result.current.clients.length).toBe(0);
          expect(result.current.clients.find(c => c.id === client.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should remove multiple clients immediately in sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 3, maxLength: 5 }
        ),
        async (clients) => {
          // Mock initial fetch with clients
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: clients }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(clients.length);
          }, { timeout: 3000 });

          const initialCount = clients.length;

          // Delete multiple clients
          for (let i = 0; i < Math.min(3, clients.length); i++) {
            const clientToDelete = clients[i];

            // Mock successful delete response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ message: 'Client deleted successfully' }),
            });

            await act(async () => {
              await result.current.deleteClient(clientToDelete.id);
            });

            // Verify client count decreases immediately
            await waitFor(() => {
              expect(result.current.clients.length).toBe(initialCount - i - 1);
            }, { timeout: 3000 });

            // Verify the specific client is removed
            expect(result.current.clients.find(c => c.id === clientToDelete.id)).toBeUndefined();
          }

          // Verify final count
          expect(result.current.clients.length).toBe(initialCount - Math.min(3, clients.length));
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should remove correct client from list with multiple clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        async (clients, deleteIndex) => {
          // Ensure deleteIndex is within bounds
          const actualDeleteIndex = deleteIndex % clients.length;
          const clientToDelete = clients[actualDeleteIndex];

          // Mock initial fetch with clients
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: clients }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(clients.length);
          }, { timeout: 3000 });

          // Store other clients for verification
          const otherClients = clients.filter(c => c.id !== clientToDelete.id);

          // Mock successful delete
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Client deleted successfully' }),
          });

          await act(async () => {
            await result.current.deleteClient(clientToDelete.id);
          });

          // Verify only the target client is removed
          await waitFor(() => {
            expect(result.current.clients.length).toBe(clients.length - 1);
            expect(result.current.clients.find(c => c.id === clientToDelete.id)).toBeUndefined();
          }, { timeout: 3000 });

          // Verify all other clients remain
          otherClients.forEach(otherClient => {
            const stillExists = result.current.clients.find(c => c.id === otherClient.id);
            expect(stillExists).toBeDefined();
            expect(stillExists?.name).toBe(otherClient.name);
            expect(stillExists?.email).toBe(otherClient.email);
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should maintain list order after optimistic delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 4, maxLength: 8 }
        ),
        async (clients) => {
          // Mock initial fetch with clients
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: clients }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(clients.length);
          }, { timeout: 3000 });

          // Delete the middle client
          const middleIndex = Math.floor(clients.length / 2);
          const clientToDelete = clients[middleIndex];

          // Mock successful delete
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Client deleted successfully' }),
          });

          await act(async () => {
            await result.current.deleteClient(clientToDelete.id);
          });

          // Verify order is maintained
          await waitFor(() => {
            const remainingClients = result.current.clients;
            expect(remainingClients.length).toBe(clients.length - 1);

            // Check that the order of remaining clients matches original order
            const expectedOrder = clients.filter(c => c.id !== clientToDelete.id);
            expectedOrder.forEach((expectedClient, index) => {
              expect(remainingClients[index].id).toBe(expectedClient.id);
            });
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should not affect other clients when deleting one', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          }),
          { minLength: 3, maxLength: 6 }
        ),
        async (clients) => {
          // Mock initial fetch with clients
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: clients }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(clients.length);
          }, { timeout: 3000 });

          // Delete the first client
          const clientToDelete = clients[0];
          const otherClients = clients.slice(1);

          // Store original properties of other clients
          const originalProperties = otherClients.map(c => ({ ...c }));

          // Mock successful delete
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Client deleted successfully' }),
          });

          await act(async () => {
            await result.current.deleteClient(clientToDelete.id);
          });

          // Verify all properties of other clients remain unchanged
          await waitFor(() => {
            originalProperties.forEach((originalClient) => {
              const currentClient = result.current.clients.find(c => c.id === originalClient.id);
              expect(currentClient).toBeDefined();
              expect(currentClient?.name).toBe(originalClient.name);
              expect(currentClient?.email).toBe(originalClient.email);
              expect(currentClient?.phone).toBe(originalClient.phone);
              expect(currentClient?.company).toBe(originalClient.company);
              expect(currentClient?.avatarUrl).toBe(originalClient.avatarUrl);
              expect(currentClient?.status).toBe(originalClient.status);
            });
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
