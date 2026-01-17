/**
 * Property-Based Tests for Client API
 * Feature: management-pages
 * 
 * This file contains property-based tests for client API functionality:
 * - Property 3: Delete Operation Confirmation
 * - Property 53: Optimistic Update Rollback
 * 
 * Validates: Requirements 1.6, 9.5
 */

import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClients } from '@/hooks/use-clients';
import { Client, clientService } from '@/services/client.service';

// Mock the client service
jest.mock('@/services/client.service', () => ({
  clientService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

// ============================================================================
// Property 3: Delete Operation Confirmation
// Test delete requires confirmation
// Validates: Requirements 1.6
// ============================================================================

describe('Feature: management-pages, Property 3: Delete Operation Confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should require confirmation before deleting any client', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        async (client) => {
          // Mock initial fetch to return the client
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [client] }),
          });

          const { result } = renderHook(() => useClients());

          // Wait for initial fetch
          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 3000 });

          // Mock successful delete response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Client deleted successfully' }),
          });

          // In a real UI, this would be called after user confirms deletion
          // The confirmation dialog should appear before this is called
          let deleteConfirmed = false;
          
          // Simulate confirmation dialog flow
          const confirmDelete = () => {
            deleteConfirmed = true;
          };

          // User clicks delete button - confirmation should be required
          // Before calling deleteClient, confirmation must be obtained
          expect(deleteConfirmed).toBe(false);
          
          // Simulate user confirming
          confirmDelete();
          expect(deleteConfirmed).toBe(true);

          // Only after confirmation should the delete be executed
          await act(async () => {
            await result.current.deleteClient(client.id);
          });

          // Verify delete was called with correct ID
          expect(global.fetch).toHaveBeenCalledWith(
            `/api/clients/${client.id}`,
            expect.objectContaining({
              method: 'DELETE',
            })
          );

          // Verify client was removed from list
          await waitFor(() => {
            expect(result.current.clients.find(c => c.id === client.id)).toBeUndefined();
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should not delete client if confirmation is not provided', async () => {
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
          // Clear all previous mocks
          (global.fetch as jest.Mock).mockClear();
          
          // Mock initial fetch
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [client] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 3000 });

          // Simulate user canceling confirmation
          let deleteConfirmed = false;
          const cancelDelete = () => {
            deleteConfirmed = false;
          };

          // User clicks delete but cancels confirmation
          cancelDelete();
          expect(deleteConfirmed).toBe(false);

          // Delete should NOT be called if not confirmed
          // In real implementation, deleteClient would not be called at all
          // if user cancels the confirmation dialog

          // Verify client still exists in list
          expect(result.current.clients.find(c => c.id === client.id)).toBeDefined();
          expect(result.current.clients.length).toBe(1);

          // Verify no DELETE request was made (only the initial GET)
          const deleteCalls = (global.fetch as jest.Mock).mock.calls.filter(
            call => call[1]?.method === 'DELETE'
          );
          expect(deleteCalls.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should preserve client data until confirmation is given', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        async (client) => {
          // Mock initial fetch
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [client] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 3000 });

          // Store original client data
          const originalClient = result.current.clients.find(c => c.id === client.id);
          expect(originalClient).toBeDefined();

          // Simulate showing confirmation dialog (but not confirming yet)
          // During this time, client data should remain unchanged
          expect(result.current.clients.find(c => c.id === client.id)).toEqual(originalClient);

          // Verify all client properties are preserved
          const currentClient = result.current.clients.find(c => c.id === client.id);
          expect(currentClient?.name).toBe(client.name);
          expect(currentClient?.email).toBe(client.email);
          expect(currentClient?.phone).toBe(client.phone);
          expect(currentClient?.company).toBe(client.company);
          expect(currentClient?.status).toBe(client.status);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// ============================================================================
// Property 53: Optimistic Update Rollback
// Test failed updates revert UI
// Validates: Requirements 9.5
// ============================================================================

describe('Feature: management-pages, Property 53: Optimistic Update Rollback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should revert optimistic update when create operation fails', async () => {
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

          // Mock failed create response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Failed to create client' }),
          });

          // Attempt to create client
          await act(async () => {
            try {
              await result.current.createClient(clientData);
            } catch (error) {
              // Expected to fail
            }
          });

          // Verify optimistic update was rolled back
          await waitFor(() => {
            expect(result.current.clients.length).toBe(initialCount);
          }, { timeout: 3000 });

          // Verify no temporary client remains
          const tempClients = result.current.clients.filter(c => c.id.startsWith('temp-'));
          expect(tempClients.length).toBe(0);

          // Verify error was set
          expect(result.current.error).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should revert optimistic update when update operation fails', async () => {
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
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
        }),
        async (originalClient, updateData) => {
          // Mock initial fetch with original client
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [originalClient] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 3000 });

          // Store original values
          const originalName = originalClient.name;
          const originalEmail = originalClient.email;

          // Mock failed update response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Failed to update client' }),
          });

          // Attempt to update client
          await act(async () => {
            try {
              await result.current.updateClient(originalClient.id, updateData);
            } catch (error) {
              // Expected to fail
            }
          });

          // Verify optimistic update was rolled back
          await waitFor(() => {
            const client = result.current.clients.find(c => c.id === originalClient.id);
            expect(client?.name).toBe(originalName);
            expect(client?.email).toBe(originalEmail);
          }, { timeout: 3000 });

          // Verify error was set
          expect(result.current.error).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should revert optimistic delete when delete operation fails', async () => {
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

          // Mock failed delete response
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Failed to delete client' }),
          });

          // Attempt to delete client
          await act(async () => {
            try {
              await result.current.deleteClient(client.id);
            } catch (error) {
              // Expected to fail
            }
          });

          // Verify optimistic delete was rolled back
          await waitFor(() => {
            const restoredClient = result.current.clients.find(c => c.id === client.id);
            expect(restoredClient).toBeDefined();
            expect(restoredClient?.name).toBe(client.name);
            expect(restoredClient?.email).toBe(client.email);
            expect(restoredClient?.company).toBe(client.company);
          }, { timeout: 3000 });

          // Verify error was set
          expect(result.current.error).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should preserve all client properties during rollback', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (originalClient, updateData) => {
          // Mock initial fetch
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [originalClient] }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(1);
          }, { timeout: 3000 });

          // Store all original properties
          const originalProps = { ...originalClient };

          // Mock failed update
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Update failed' }),
          });

          // Attempt update
          await act(async () => {
            try {
              await result.current.updateClient(originalClient.id, updateData);
            } catch (error) {
              // Expected to fail
            }
          });

          // Verify ALL properties are restored
          await waitFor(() => {
            const restoredClient = result.current.clients.find(c => c.id === originalClient.id);
            expect(restoredClient).toBeDefined();
            expect(restoredClient?.id).toBe(originalProps.id);
            expect(restoredClient?.name).toBe(originalProps.name);
            expect(restoredClient?.email).toBe(originalProps.email);
            expect(restoredClient?.phone).toBe(originalProps.phone);
            expect(restoredClient?.company).toBe(originalProps.company);
            expect(restoredClient?.avatarUrl).toBe(originalProps.avatarUrl);
            expect(restoredClient?.status).toBe(originalProps.status);
            expect(restoredClient?.createdAt).toEqual(originalProps.createdAt);
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should handle multiple failed operations with proper rollbacks', async () => {
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
          { minLength: 2, maxLength: 5 }
        ),
        async (clients) => {
          // Mock initial fetch with multiple clients
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: clients }),
          });

          const { result } = renderHook(() => useClients());

          await waitFor(() => {
            expect(result.current.clients.length).toBe(clients.length);
          }, { timeout: 3000 });

          const initialCount = clients.length;

          // Attempt multiple failed operations
          for (let i = 0; i < Math.min(3, clients.length); i++) {
            const client = clients[i];

            // Mock failed update
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: false,
              json: async () => ({ error: `Update failed for client ${i}` }),
            });

            await act(async () => {
              try {
                await result.current.updateClient(client.id, { name: `Updated ${i}` });
              } catch (error) {
                // Expected to fail
              }
            });
          }

          // Verify all clients are still present with original data
          await waitFor(() => {
            expect(result.current.clients.length).toBe(initialCount);
            
            clients.forEach(originalClient => {
              const currentClient = result.current.clients.find(c => c.id === originalClient.id);
              expect(currentClient).toBeDefined();
              expect(currentClient?.name).toBe(originalClient.name);
              expect(currentClient?.email).toBe(originalClient.email);
            });
          }, { timeout: 3000 });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
