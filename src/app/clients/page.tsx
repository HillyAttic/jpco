'use client';

import React, { useState } from 'react';
import { useClients } from '@/hooks/use-clients';
import { Client } from '@/services/client.service';
import { ClientList } from '@/components/clients/ClientList';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientBulkImportModal } from '@/components/clients/ClientBulkImportModal';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { Button } from '@/components/ui/button';
import { PlusIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

/**
 * Client Master Page
 * Main page for managing clients with CRUD operations
 * Validates Requirements: 1.1, 1.2, 1.3
 */
export default function ClientsPage() {
  const {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
  } = useClients();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  /**
   * Handle opening the create modal
   */
  const handleAddNew = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  /**
   * Handle opening the import modal
   */
  const handleImport = () => {
    setIsImportModalOpen(true);
  };

  /**
   * Handle import completion
   */
  const handleImportComplete = () => {
    // Refresh the client list
    window.location.reload();
  };

  /**
   * Handle opening the edit modal
   */
  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  /**
   * Handle delete with confirmation
   * Validates Requirements: 1.6
   */
  const handleDelete = async (id: string) => {
    // Show confirmation dialog
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      
      // Use browser's confirm dialog for now
      const confirmed = window.confirm(
        'Are you sure you want to delete this client? This action cannot be undone.'
      );
      
      if (!confirmed) {
        setDeleteConfirmId(null);
        return;
      }
    }

    try {
      await deleteClient(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    }
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      if (selectedClient) {
        // Update existing client
        await updateClient(selectedClient.id!, {
          name: data.name,
          businessName: data.businessName,
          pan: data.pan,
          tan: data.tan,
          gstin: data.gstin,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          zipCode: data.zipCode,
          status: data.status,
        });
      } else {
        // Create new client
        await createClient({
          name: data.name,
          businessName: data.businessName,
          pan: data.pan,
          tan: data.tan,
          gstin: data.gstin,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          zipCode: data.zipCode,
          status: data.status,
        });
      }

      setIsModalOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error submitting client:', error);
      throw error; // Let the modal handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb pageName="Client Master" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Client Master
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your client information and contacts
          </p>
        </div>

        {/* Add New Client Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleImport}
            variant="outline"
            className="flex items-center gap-2"
            size="lg"
          >
            <CloudArrowUpIcon className="w-5 h-5" />
            Bulk Import
          </Button>
          <Button
            onClick={handleAddNew}
            className="flex items-center gap-2 text-white"
            size="lg"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading clients</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* View Toggle Buttons */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
            aria-label="List view"
          >
            List
          </button>
        </div>
      </div>

      {/* Client List */}
      <ClientList
        clients={clients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        viewMode={viewMode}
      />

      {/* Client Modal (Create/Edit) */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        client={selectedClient}
        isLoading={isSubmitting}
      />

      {/* Bulk Import Modal */}
      <ClientBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}