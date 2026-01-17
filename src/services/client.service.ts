/**
 * Client Service
 * Handles all client-related Firebase operations
 */

import { createFirebaseService, QueryOptions } from './firebase.service';

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  avatar?: File;
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
        ['name', 'email', 'company'],
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
      ['name', 'email', 'company'],
      query
    );
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
