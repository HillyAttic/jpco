/**
 * Client Admin Service
 * Server-side service using Firebase Admin SDK for client operations
 */

import { createAdminService } from './admin-base.service';

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

// Create base admin service
const baseService = createAdminService<Client>('clients');

/**
 * Client Admin Service - Server-side only
 */
export const clientAdminService = {
  ...baseService,

  /**
   * Get all clients with search filter
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Client[]> {
    const options: any = {};

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

    // Add limit
    if (filters?.limit) {
      options.limit = filters.limit;
    }

    // Add default ordering
    options.orderBy = {
      field: 'createdAt',
      direction: 'desc' as const,
    };

    let clients = await baseService.getAll(options);

    // Apply search filter (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      clients = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchLower) ||
          client.businessName?.toLowerCase().includes(searchLower) ||
          client.email?.toLowerCase().includes(searchLower) ||
          client.phone?.toLowerCase().includes(searchLower)
      );
    }

    return clients;
  },
};
