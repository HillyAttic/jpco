/**
 * Client Service
 * Handles all client-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';

export interface Client {
  id?: string;
  name: string;
  businessName?: string;
  pan?: string;
  tan?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientFormData {
  name: string;
  businessName?: string;
  pan?: string;
  tan?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface ClientImportRow {
  Name: string;
  'Business Name'?: string;
  'P.A.N.'?: string;
  'T.A.N.'?: string;
  GSTIN?: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  City?: string;
  State?: string;
  Country?: string;
  'Zip Code'?: string;
}

// Create the Firebase service instance for clients
const clientFirebaseService = createFirebaseService<Client>('clients');

/**
 * Client Service API
 */
export const clientService = {
  /**
   * Get all clients with optional filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Client[]> {
    const options: QueryOptions = {};

    // Add status filter
    if (filters?.status) {
      options.filters = [
        {
          field: 'status',
          operator: '==',
          value: filters.status,
        },
      ];
    }

    // Add pagination
    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    // Add default ordering
    options.orderByField = 'createdAt';
    options.orderDirection = 'desc';

    let clients = await clientFirebaseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      clients = await clientFirebaseService.searchMultipleFields(
        ['name', 'businessName', 'email', 'phone', 'gstin', 'pan'],
        filters.search,
        options
      );
    }

    return clients;
  },

  /**
   * Get paginated clients
   */
  async getPaginated(
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{ data: Client[]; lastDoc: any; hasMore: boolean }> {
    return clientFirebaseService.getPaginated({
      orderByField: 'createdAt',
      orderDirection: 'desc',
      pagination: {
        pageSize,
        lastDoc,
      },
    });
  },

  /**
   * Get a client by ID
   */
  async getById(id: string): Promise<Client | null> {
    return clientFirebaseService.getById(id);
  },

  /**
   * Create a new client
   */
  async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    return clientFirebaseService.create(data);
  },

  /**
   * Update a client
   */
  async update(id: string, data: Partial<Omit<Client, 'id'>>): Promise<Client> {
    return clientFirebaseService.update(id, data);
  },

  /**
   * Delete a client
   */
  async delete(id: string): Promise<void> {
    return clientFirebaseService.delete(id);
  },

  /**
   * Search clients
   */
  async search(query: string): Promise<Client[]> {
    return clientFirebaseService.searchMultipleFields(
      ['name', 'businessName', 'email', 'phone', 'gstin', 'pan'],
      query
    );
  },

  /**
   * Bulk import clients from CSV data
   */
  async bulkImport(clients: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string; data: any }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>,
    };

    for (let i = 0; i < clients.length; i++) {
      try {
        await clientFirebaseService.create(clients[i]);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: clients[i],
        });
      }
    }

    return results;
  },

  /**
   * Count clients
   */
  async count(filters?: { status?: string }): Promise<number> {
    const options: QueryOptions = {};

    if (filters?.status) {
      options.filters = [
        {
          field: 'status',
          operator: '==',
          value: filters.status,
        },
      ];
    }

    return clientFirebaseService.count(options);
  },
};
