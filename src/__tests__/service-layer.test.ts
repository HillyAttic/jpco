/**
 * Property-Based Tests for Service Layer
 * Feature: management-pages
 * 
 * This file contains property-based tests for the Firebase service layer:
 * - Property 1: Create Operation Persistence
 * - Property 18: Filter Clear Restoration
 * - Property 49: Client Pagination Trigger
 * 
 * Validates: Requirements 1.3, 1.10, 8.3
 */

import fc from 'fast-check';
import { FirebaseService, QueryOptions } from '@/services/firebase.service';
import { clientService, Client } from '@/services/client.service';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
  },
}));


// Import mocked functions
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  Timestamp,
} from 'firebase/firestore';

// Helper arbitraries for generating valid client data
const validClientArbitrary = fc.record({
  name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/), // e.g., "John Doe"
  email: fc.emailAddress(),
  phone: fc.stringMatching(/^\d{3}-\d{3}-\d{4}$/), // e.g., "555-123-4567"
  company: fc.stringMatching(/^[A-Z][a-z]+ (Inc|LLC|Corp)$/), // e.g., "Acme Inc"
  status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
});

const validClientWithIdArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
  email: fc.emailAddress(),
  phone: fc.stringMatching(/^\d{3}-\d{3}-\d{4}$/),
  company: fc.stringMatching(/^[A-Z][a-z]+ (Inc|LLC|Corp)$/),
  status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

// ============================================================================
// Property 1: Create Operation Persistence
// Test create saves and retrieves data
// Validates: Requirements 1.3
// ============================================================================

describe('Feature: management-pages, Property 1: Create Operation Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (collection as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (query as jest.Mock).mockReturnValue({});
  });

  it('should save and retrieve any valid client data', async () => {
    await fc.assert(
      fc.asyncProperty(
        validClientArbitrary,
        async (clientData) => {
          const mockId = fc.sample(fc.uuid(), 1)[0];
          const mockTimestamp = { toDate: () => new Date() };

          // Mock addDoc to return a document reference
          (addDoc as jest.Mock).mockResolvedValueOnce({
            id: mockId,
          });

          // Mock getDoc to return the created document
          (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            id: mockId,
            data: () => ({
              ...clientData,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          });

          // Create the client
          const service = new FirebaseService<Client>('clients');
          const createdClient = await service.create(clientData);

          // Verify the client was created with an ID
          expect(createdClient).toBeDefined();
          expect(createdClient.id).toBe(mockId);
          expect(createdClient.name).toBe(clientData.name);
          expect(createdClient.email).toBe(clientData.email);
          expect(createdClient.phone).toBe(clientData.phone);
          expect(createdClient.company).toBe(clientData.company);
          expect(createdClient.status).toBe(clientData.status);

          // Verify addDoc was called
          expect(addDoc).toHaveBeenCalled();
          expect(getDoc).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should persist all client properties after creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validClientArbitrary.chain(client => 
          fc.record({
            ...client,
            avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
          })
        ),
        async (clientData) => {
          const mockId = fc.sample(fc.uuid(), 1)[0];
          const mockTimestamp = { toDate: () => new Date() };

          (addDoc as jest.Mock).mockResolvedValueOnce({ id: mockId });
          (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            id: mockId,
            data: () => ({
              ...clientData,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          });

          const service = new FirebaseService<Client>('clients');
          const createdClient = await service.create(clientData);

          // Verify all properties are persisted
          expect(createdClient.name).toBe(clientData.name);
          expect(createdClient.email).toBe(clientData.email);
          expect(createdClient.phone).toBe(clientData.phone);
          expect(createdClient.company).toBe(clientData.company);
          expect(createdClient.status).toBe(clientData.status);
          
          if (clientData.avatarUrl) {
            expect(createdClient.avatarUrl).toBe(clientData.avatarUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should retrieve created client by ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        validClientArbitrary,
        async (clientData) => {
          const mockId = fc.sample(fc.uuid(), 1)[0];
          const mockTimestamp = { toDate: () => new Date() };

          // Mock creation
          (addDoc as jest.Mock).mockResolvedValueOnce({ id: mockId });
          (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            id: mockId,
            data: () => ({
              ...clientData,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          });

          const service = new FirebaseService<Client>('clients');
          const createdClient = await service.create(clientData);

          // Mock retrieval
          (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            id: mockId,
            data: () => ({
              ...clientData,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          });

          // Retrieve the client
          const retrievedClient = await service.getById(mockId);

          // Verify retrieved client matches created client
          expect(retrievedClient).toBeDefined();
          expect(retrievedClient?.id).toBe(createdClient.id);
          expect(retrievedClient?.name).toBe(createdClient.name);
          expect(retrievedClient?.email).toBe(createdClient.email);
          expect(retrievedClient?.phone).toBe(createdClient.phone);
          expect(retrievedClient?.company).toBe(createdClient.company);
          expect(retrievedClient?.status).toBe(createdClient.status);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 18: Filter Clear Restoration
// Test clearing filters restores full list
// Validates: Requirements 8.3
// ============================================================================

describe('Feature: management-pages, Property 18: Filter Clear Restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (collection as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (query as jest.Mock).mockReturnValue({});
  });

  it('should restore full list when filters are cleared', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validClientWithIdArbitrary, { minLength: 5, maxLength: 30 }),
        async (allClients) => {
          const mockTimestamp = { toDate: () => new Date() };

          // Mock getDocs to return all clients (no filter)
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const service = new FirebaseService<Client>('clients');
          
          // Get all clients without filters
          const unfilteredClients = await service.getAll();
          const unfilteredCount = unfilteredClients.length;

          // Apply a filter (e.g., status = 'active')
          const activeClients = allClients.filter(c => c.status === 'active');
          
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: activeClients.map(client => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const filteredClients = await service.getAll({
            filters: [{ field: 'status', operator: '==', value: 'active' }],
          });

          // Verify filtered list is smaller or equal
          expect(filteredClients.length).toBeLessThanOrEqual(unfilteredCount);

          // Clear filters by calling getAll without filters again
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const restoredClients = await service.getAll();

          // Verify full list is restored
          expect(restoredClients.length).toBe(unfilteredCount);
          expect(restoredClients.length).toBe(allClients.length);
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should restore all client properties when filters are cleared', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validClientWithIdArbitrary, { minLength: 3, maxLength: 20 }),
        async (allClients) => {
          const mockTimestamp = { toDate: () => new Date() };

          // Get unfiltered list
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const service = new FirebaseService<Client>('clients');
          const unfilteredClients = await service.getAll();

          // Apply filter
          const filteredData = allClients.filter(c => c.status === 'active');
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: filteredData.map(client => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          await service.getAll({
            filters: [{ field: 'status', operator: '==', value: 'active' }],
          });

          // Clear filters
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const restoredClients = await service.getAll();

          // Verify all original clients are present with all properties
          allClients.forEach(originalClient => {
            const restored = restoredClients.find(c => c.id === originalClient.id);
            expect(restored).toBeDefined();
            expect(restored?.name).toBe(originalClient.name);
            expect(restored?.email).toBe(originalClient.email);
            expect(restored?.phone).toBe(originalClient.phone);
            expect(restored?.company).toBe(originalClient.company);
            expect(restored?.status).toBe(originalClient.status);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple filter applications and clearings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validClientWithIdArbitrary, { minLength: 10, maxLength: 25 }),
        async (allClients) => {
          const mockTimestamp = { toDate: () => new Date() };
          const service = new FirebaseService<Client>('clients');

          // Initial unfiltered fetch
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({ ...client, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
            })),
          });

          const initialClients = await service.getAll();
          const initialCount = initialClients.length;

          // Apply filter 1
          const activeClients = allClients.filter(c => c.status === 'active');
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: activeClients.map(client => ({
              id: client.id,
              data: () => ({ ...client, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
            })),
          });

          await service.getAll({
            filters: [{ field: 'status', operator: '==', value: 'active' }],
          });

          // Clear filters
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({ ...client, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
            })),
          });

          const restored1 = await service.getAll();
          expect(restored1.length).toBe(initialCount);

          // Apply filter 2
          const inactiveClients = allClients.filter(c => c.status === 'inactive');
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: inactiveClients.map(client => ({
              id: client.id,
              data: () => ({ ...client, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
            })),
          });

          await service.getAll({
            filters: [{ field: 'status', operator: '==', value: 'inactive' }],
          });

          // Clear filters again
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: allClients.map(client => ({
              id: client.id,
              data: () => ({ ...client, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
            })),
          });

          const restored2 = await service.getAll();
          expect(restored2.length).toBe(initialCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Property 49: Client Pagination Trigger
// Test pagination appears with >20 items
// Validates: Requirements 1.10
// ============================================================================

describe('Feature: management-pages, Property 49: Client Pagination Trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (collection as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (query as jest.Mock).mockReturnValue({});
  });

  it('should trigger pagination when more than 20 clients exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 21, max: 100 }),
        async (clientCount) => {
          const mockTimestamp = { toDate: () => new Date() };

          // Generate clients
          const clients = Array.from({ length: clientCount }, (_, i) => ({
            id: `client-${i}`,
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `555-000-${String(i).padStart(4, '0')}`,
            company: `Company ${i}`,
            status: (i % 2 === 0 ? 'active' : 'inactive') as 'active' | 'inactive',
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const service = new FirebaseService<Client>('clients');

          // Mock paginated response (first page of 20 + 1 extra to check hasMore)
          const firstPageClients = clients.slice(0, 21);
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: firstPageClients.map((client, index) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          // Get paginated results
          const result = await service.getPaginated({
            pagination: { pageSize: 20 },
          });

          // Verify pagination is triggered
          expect(result.data.length).toBe(20); // Should return exactly 20 items
          expect(result.hasMore).toBe(true); // Should indicate more pages exist
          expect(result.lastDoc).toBeDefined(); // Should have a last document for next page
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not trigger pagination when 20 or fewer clients exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        async (clientCount) => {
          const mockTimestamp = { toDate: () => new Date() };

          // Generate clients
          const clients = Array.from({ length: clientCount }, (_, i) => ({
            id: `client-${i}`,
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `555-000-${String(i).padStart(4, '0')}`,
            company: `Company ${i}`,
            status: (i % 2 === 0 ? 'active' : 'inactive') as 'active' | 'inactive',
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const service = new FirebaseService<Client>('clients');

          // Mock response with all clients (no extra for hasMore check)
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: clients.map((client) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          // Get paginated results
          const result = await service.getPaginated({
            pagination: { pageSize: 20 },
          });

          // Verify pagination is not needed
          expect(result.data.length).toBe(clientCount);
          expect(result.hasMore).toBe(false); // No more pages
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should handle pagination with custom page sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 150 }),
        async (pageSize, totalClients) => {
          const mockTimestamp = { toDate: () => new Date() };

          // Generate clients
          const clients = Array.from({ length: totalClients }, (_, i) => ({
            id: `client-${i}`,
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `555-000-${String(i).padStart(4, '0')}`,
            company: `Company ${i}`,
            status: (i % 2 === 0 ? 'active' : 'inactive') as 'active' | 'inactive',
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const service = new FirebaseService<Client>('clients');

          // Mock first page (pageSize + 1 to check hasMore)
          const firstPageClients = clients.slice(0, pageSize + 1);
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: firstPageClients.map((client) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          // Get paginated results
          const result = await service.getPaginated({
            pagination: { pageSize },
          });

          // Verify correct page size
          expect(result.data.length).toBe(pageSize);
          
          // Verify hasMore is true when total > pageSize
          if (totalClients > pageSize) {
            expect(result.hasMore).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide lastDoc for subsequent page requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 41, max: 80 }),
        async (totalClients) => {
          const mockTimestamp = { toDate: () => new Date() };
          const pageSize = 20;

          // Generate clients
          const clients = Array.from({ length: totalClients }, (_, i) => ({
            id: `client-${i}`,
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `555-000-${String(i).padStart(4, '0')}`,
            company: `Company ${i}`,
            status: (i % 2 === 0 ? 'active' : 'inactive') as 'active' | 'inactive',
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const service = new FirebaseService<Client>('clients');

          // Mock first page
          const firstPageClients = clients.slice(0, pageSize + 1);
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: firstPageClients.map((client) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          // Get first page
          const firstPage = await service.getPaginated({
            pagination: { pageSize },
          });

          // Verify lastDoc is provided for next page
          expect(firstPage.lastDoc).toBeDefined();
          expect(firstPage.hasMore).toBe(true);

          // Mock second page
          const secondPageClients = clients.slice(pageSize, Math.min(pageSize * 2 + 1, totalClients));
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: secondPageClients.map((client) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          // Get second page using lastDoc
          const secondPage = await service.getPaginated({
            pagination: { pageSize, lastDoc: firstPage.lastDoc! },
          });

          // Verify second page has different clients
          expect(secondPage.data.length).toBeGreaterThan(0);
          expect(secondPage.data[0].id).not.toBe(firstPage.data[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly indicate no more pages on last page', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 21, max: 40 }),
        async (totalClients) => {
          const mockTimestamp = { toDate: () => new Date() };
          const pageSize = 20;

          // Generate clients
          const clients = Array.from({ length: totalClients }, (_, i) => ({
            id: `client-${i}`,
            name: `Client ${i}`,
            email: `client${i}@example.com`,
            phone: `555-000-${String(i).padStart(4, '0')}`,
            company: `Company ${i}`,
            status: (i % 2 === 0 ? 'active' : 'inactive') as 'active' | 'inactive',
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const service = new FirebaseService<Client>('clients');

          // Mock first page
          const firstPageClients = clients.slice(0, pageSize + 1);
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: firstPageClients.map((client) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const firstPage = await service.getPaginated({
            pagination: { pageSize },
          });

          // Mock second (last) page
          const remainingClients = clients.slice(pageSize);
          (getDocs as jest.Mock).mockResolvedValueOnce({
            docs: remainingClients.map((client) => ({
              id: client.id,
              data: () => ({
                ...client,
                createdAt: mockTimestamp,
                updatedAt: mockTimestamp,
              }),
            })),
          });

          const lastPage = await service.getPaginated({
            pagination: { pageSize, lastDoc: firstPage.lastDoc! },
          });

          // Verify last page indicates no more pages
          expect(lastPage.hasMore).toBe(false);
          expect(lastPage.data.length).toBe(totalClients - pageSize);
        }
      ),
      { numRuns: 100 }
    );
  });
});
