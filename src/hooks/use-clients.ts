import { useState, useEffect, useCallback } from 'react';
import { Client } from '@/services/client.service';
import { authenticatedFetch } from '@/lib/api-client';

interface UseClientsOptions {
  initialFetch?: boolean;
}

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: Error | null;
  createClient: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Omit<Client, 'id'>>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refreshClients: () => Promise<void>;
  searchClients: (query: string) => void;
  filterClients: (filters: { status?: string }) => void;
}

/**
 * Custom hook for managing clients with CRUD operations and optimistic updates
 * Validates Requirements: 9.3, 9.4, 9.5
 */
export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { initialFetch = true } = options;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  /**
   * Fetch clients from API
   */
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const response = await authenticatedFetch(`/api/clients?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const result = await response.json();
      setClients(result.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (initialFetch) {
      fetchClients();
    }
  }, [initialFetch, fetchClients]);

  /**
   * Create a new client with optimistic update
   * Validates Requirements: 9.3
   */
  const createClient = useCallback(
    async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticClient: Client = {
        ...data,
        id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistic update - add client immediately
      setClients((prev) => [optimisticClient, ...prev]);

      try {
        const response = await authenticatedFetch('/api/clients', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create client');
        }

        const newClient = await response.json();

        // Replace optimistic client with real client
        setClients((prev) =>
          prev.map((client) => (client.id === tempId ? newClient : client))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setClients((prev) => prev.filter((client) => client.id !== tempId));
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Update an existing client with optimistic update
   */
  const updateClient = useCallback(
    async (id: string, data: Partial<Omit<Client, 'id'>>) => {
      // Store original client for rollback
      const originalClient = clients.find((c) => c.id === id);
      if (!originalClient) {
        throw new Error('Client not found');
      }

      // Optimistic update - update client immediately
      setClients((prev) =>
        prev.map((client) =>
          client.id === id
            ? { ...client, ...data, updatedAt: new Date() }
            : client
        )
      );

      try {
        const response = await authenticatedFetch(`/api/clients/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update client');
        }

        const updatedClient = await response.json();

        // Replace optimistic update with server response
        setClients((prev) =>
          prev.map((client) => (client.id === id ? updatedClient : client))
        );
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setClients((prev) =>
          prev.map((client) => (client.id === id ? originalClient : client))
        );
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [clients]
  );

  /**
   * Delete a client with optimistic update
   * Validates Requirements: 9.4
   */
  const deleteClient = useCallback(
    async (id: string) => {
      // Store original client for rollback
      const originalClient = clients.find((c) => c.id === id);
      if (!originalClient) {
        throw new Error('Client not found');
      }

      // Optimistic update - remove client immediately
      setClients((prev) => prev.filter((client) => client.id !== id));

      try {
        const response = await authenticatedFetch(`/api/clients/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete client');
        }
      } catch (err) {
        // Rollback optimistic update on error (Validates Requirements: 9.5)
        setClients((prev) => [...prev, originalClient]);
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [clients]
  );

  /**
   * Refresh clients from server
   */
  const refreshClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  /**
   * Search clients
   */
  const searchClients = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Filter clients
   */
  const filterClients = useCallback((filters: { status?: string }) => {
    setStatusFilter(filters.status);
  }, []);

  return {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refreshClients,
    searchClients,
    filterClients,
  };
}
