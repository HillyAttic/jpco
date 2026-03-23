import { authenticatedFetch } from '@/lib/api-client';

export interface PendingInvoice {
  id?: string;
  clientName?: string;
  services?: string;
  amount?: number;
  description?: string;
  remark?: string;
  status: 'pending' | 'archived';
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const pendingInvoiceService = {
  async getAll(status?: 'pending' | 'archived'): Promise<PendingInvoice[]> {
    const url = status
      ? `/api/admin/pending-invoices?status=${status}`
      : '/api/admin/pending-invoices';
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error('Failed to fetch pending invoices');
    return response.json();
  },

  async create(invoice: Omit<PendingInvoice, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>): Promise<PendingInvoice> {
    const response = await authenticatedFetch('/api/admin/pending-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!response.ok) throw new Error('Failed to create pending invoice');
    return response.json();
  },

  async update(id: string, invoice: Partial<PendingInvoice>): Promise<PendingInvoice> {
    const response = await authenticatedFetch(`/api/admin/pending-invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    if (!response.ok) throw new Error('Failed to update pending invoice');
    return response.json();
  },

  async archive(id: string): Promise<PendingInvoice> {
    const response = await authenticatedFetch(`/api/admin/pending-invoices/${id}/archive`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to archive pending invoice');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await authenticatedFetch(`/api/admin/pending-invoices/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete pending invoice');
  },
};
