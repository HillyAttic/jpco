'use client';

import React, { useState } from 'react';
import { useClients } from '@/hooks/use-clients';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { Client } from '@/services/client.service';
import { ClientList } from '@/components/clients/ClientList';
import { ClientModal } from '@/components/clients/ClientModal';
import { BulkActionToolbar } from '@/components/ui/BulkActionToolbar';
import { BulkDeleteDialog } from '@/components/ui/BulkDeleteDialog';
import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { exportToCSV, generateTimestampedFilename } from '@/utils/csv-export';

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

  // Bulk selection state
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    allSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  } = useBulkSelection(clients);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  /**
   * Handle opening the create modal
   */
  const handleAddNew = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
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
          email: data.email,
          phone: data.phone,
          company: data.company,
          status: data.status,
          // TODO: Handle avatar upload
          avatarUrl: data.avatar ? undefined : selectedClient.avatarUrl,
        });
      } else {
        // Create new client
        await createClient({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          status: data.status,
          // TODO: Handle avatar upload
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

  /**
   * Handle bulk delete
   * Validates Requirements: 10.1, 10.2
   */
  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true);
  };

  /**
   * Confirm bulk delete
   */
  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      // Delete all selected clients
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteClient(id))
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting clients:', error);
      alert('Failed to delete some clients. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /**
   * Handle bulk export
   * Validates Requirements: 10.3
   */
  const handleBulkExport = () => {
    // Prepare data for export
    const exportData = selectedItems.map((client) => ({
      Name: client.name,
      Email: client.email,
      Phone: client.phone,
      Company: client.company,
      Status: client.status,
      'Created At': client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '',
    }));

    // Generate filename and export
    const filename = generateTimestampedFilename('clients_export');
    exportToCSV(exportData, filename);
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
        <Button
          onClick={handleAddNew}
          className="flex items-center gap-2"
          size="lg"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Client
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading clients</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Client List */}
      <ClientList
        clients={clients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        selectedIds={selectedIds}
        onSelect={toggleSelection}
        isSelected={isSelected}
      />

      {/* Bulk Action Toolbar */}
      {selectedCount > 0 && (
        <BulkActionToolbar
          selectedCount={selectedCount}
          totalCount={clients.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        itemCount={selectedCount}
        itemType="client"
        onConfirm={handleConfirmBulkDelete}
        loading={isBulkDeleting}
      />

      {/* Client Modal (Create/Edit) */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        client={selectedClient}
        isLoading={isSubmitting}
      />
    </div>
  );
}