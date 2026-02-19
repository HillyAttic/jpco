/**
 * Client Visit Tracking Service
 */

import { createFirebaseService, QueryOptions } from './firebase.service';
import { ClientVisit, ClientVisitFilters, ClientVisitStats } from '@/types/client-visit.types';

const visitFirebaseService = createFirebaseService<ClientVisit>('client-visits');

export const clientVisitService = {
  /**
   * Get all client visits with filters
   */
  async getAll(filters?: ClientVisitFilters): Promise<ClientVisit[]> {
    const options: QueryOptions = {
      filters: [],
      orderByField: 'visitDate',
      orderDirection: 'desc',
    };

    if (filters?.clientId) {
      options.filters!.push({
        field: 'clientId',
        operator: '==',
        value: filters.clientId,
      });
    }

    if (filters?.employeeId) {
      options.filters!.push({
        field: 'employeeId',
        operator: '==',
        value: filters.employeeId,
      });
    }

    if (filters?.limit) {
      options.pagination = {
        pageSize: filters.limit,
      };
    }

    let visits = await visitFirebaseService.getAll(options);

    // Client-side date range filter
    if (filters?.startDate) {
      visits = visits.filter(v => new Date(v.visitDate) >= filters.startDate!);
    }

    if (filters?.endDate) {
      visits = visits.filter(v => new Date(v.visitDate) <= filters.endDate!);
    }

    // Client-side search
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      visits = visits.filter(v =>
        v.clientName.toLowerCase().includes(searchLower) ||
        v.employeeName.toLowerCase().includes(searchLower) ||
        v.taskTitle.toLowerCase().includes(searchLower)
      );
    }

    return visits;
  },

  /**
   * Get visit by ID
   */
  async getById(id: string): Promise<ClientVisit | null> {
    return await visitFirebaseService.getById(id);
  },

  /**
   * Record a client visit
   */
  async recordVisit(data: Omit<ClientVisit, 'id' | 'createdAt'>): Promise<ClientVisit> {
    return await visitFirebaseService.create(data);
  },

  /**
   * Get visits by client
   */
  async getByClient(clientId: string, limit?: number): Promise<ClientVisit[]> {
    return await this.getAll({ clientId, limit });
  },

  /**
   * Get visits by employee
   */
  async getByEmployee(employeeId: string, limit?: number): Promise<ClientVisit[]> {
    return await this.getAll({ employeeId, limit });
  },

  /**
   * Get visit statistics
   */
  async getStats(filters?: ClientVisitFilters): Promise<ClientVisitStats> {
    const visits = await this.getAll(filters);

    // Count unique clients
    const uniqueClients = new Set(visits.map(v => v.clientId));
    
    // Count unique employees
    const uniqueEmployees = new Set(visits.map(v => v.employeeId));

    // Visits by client
    const clientCounts = new Map<string, { name: string; count: number }>();
    visits.forEach(v => {
      const existing = clientCounts.get(v.clientId);
      if (existing) {
        existing.count++;
      } else {
        clientCounts.set(v.clientId, { name: v.clientName, count: 1 });
      }
    });

    // Visits by employee
    const employeeCounts = new Map<string, { name: string; count: number }>();
    visits.forEach(v => {
      const existing = employeeCounts.get(v.employeeId);
      if (existing) {
        existing.count++;
      } else {
        employeeCounts.set(v.employeeId, { name: v.employeeName, count: 1 });
      }
    });

    return {
      totalVisits: visits.length,
      uniqueClients: uniqueClients.size,
      uniqueEmployees: uniqueEmployees.size,
      visitsByClient: Array.from(clientCounts.values())
        .map(v => ({ clientName: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count),
      visitsByEmployee: Array.from(employeeCounts.values())
        .map(v => ({ employeeName: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count),
    };
  },

  /**
   * Delete visit record
   */
  async delete(id: string): Promise<void> {
    await visitFirebaseService.delete(id);
  },
};
