/**
 * Client Admin Service
 * Server-side service using Firebase Admin SDK for client operations
 */

import { createAdminService } from './admin-base.service';

export interface Client {
  id?: string;
  clientName: string;
  businessName?: string;
  taxIdentifiers?: {
    pan?: string;
    tan?: string;
    gstin?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  compliance?: {
    roc: boolean;
    gstr1: boolean;
    gst3b: boolean;
    iff: boolean;
    itr: boolean;
    taxAudit: boolean;
    accounting: boolean;
    clientVisit: boolean;
    bank: boolean;
    tcs: boolean;
    tds: boolean;
    statutoryAudit: boolean;
  };
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
          client.clientName.toLowerCase().includes(searchLower) ||
          client.businessName?.toLowerCase().includes(searchLower) ||
          client.contact?.email?.toLowerCase().includes(searchLower) ||
          client.contact?.phone?.toLowerCase().includes(searchLower)
      );
    }

    return clients;
  },
};
