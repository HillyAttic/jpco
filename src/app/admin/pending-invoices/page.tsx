'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlusCircleIcon, PencilIcon, TrashIcon, CheckCircleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { pendingInvoiceService, type PendingInvoice } from '@/services/pending-invoice.service';
import { CreateEditInvoiceModal } from '@/components/admin/CreateEditInvoiceModal';

type ActiveTab = 'pending' | 'archived';

export default function PendingInvoicesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PendingInvoice | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'archive' | null;
    invoiceId: string | null;
    isLoading: boolean;
  }>({ isOpen: false, type: null, invoiceId: null, isLoading: false });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pendingInvoiceService.getAll(activeTab);
      setInvoices(data);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreate = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: PendingInvoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleSave = async (invoiceData: Omit<PendingInvoice, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>) => {
    setIsSaving(true);
    try {
      if (editingInvoice?.id) {
        await pendingInvoiceService.update(editingInvoice.id, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        await pendingInvoiceService.create(invoiceData);
        toast.success('Invoice created successfully');
      }
      setIsModalOpen(false);
      fetchInvoices();
    } catch {
      toast.error('Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const openArchiveConfirm = (invoiceId: string) => {
    setConfirmDialog({ isOpen: true, type: 'archive', invoiceId, isLoading: false });
  };

  const openDeleteConfirm = (invoiceId: string) => {
    setConfirmDialog({ isOpen: true, type: 'delete', invoiceId, isLoading: false });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, type: null, invoiceId: null, isLoading: false });
  };

  const confirmAction = async () => {
    if (!confirmDialog.invoiceId) return;
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      if (confirmDialog.type === 'archive') {
        await pendingInvoiceService.archive(confirmDialog.invoiceId);
        toast.success('Invoice marked as complete');
      } else {
        await pendingInvoiceService.delete(confirmDialog.invoiceId);
        toast.success('Invoice deleted');
      }
      closeConfirm();
      fetchInvoices();
    } catch {
      toast.error(`Failed to ${confirmDialog.type} invoice`);
      setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage invoice requests
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <PlusCircleIcon className="w-5 h-5" />
          New Invoice
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-4 px-1 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <ArchiveBoxIcon className="w-4 h-4" />
                Pending
                {activeTab === 'pending' && invoices.length > 0 && (
                  <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {invoices.length}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`pb-4 px-1 font-medium text-sm transition-colors ${
                activeTab === 'archived'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircleSolidIcon className="w-4 h-4" />
                Archived
                {activeTab === 'archived' && invoices.length > 0 && (
                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {invoices.length}
                  </span>
                )}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <ArchiveBoxIcon className="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
            No {activeTab} invoices
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'pending'
              ? 'Create a new invoice to get started'
              : 'Completed invoices will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow ${
                activeTab === 'archived' ? 'opacity-80' : ''
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                {activeTab === 'archived' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    <CheckCircleSolidIcon className="w-3.5 h-3.5" />
                    Archived
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                    <ArchiveBoxIcon className="w-3.5 h-3.5" />
                    Pending
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(invoice.createdAt)}
                </span>
              </div>

              {/* Card body */}
              <div className="space-y-2 mb-4">
                {invoice.clientName && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Client: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{invoice.clientName}</span>
                  </div>
                )}
                {invoice.services && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Services: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{invoice.services}</span>
                  </div>
                )}
                {invoice.amount != null && (
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount: </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.amount)}</span>
                  </div>
                )}
                {invoice.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{invoice.description}</p>
                )}
                {invoice.remark && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">📌 {invoice.remark}</p>
                )}
                {activeTab === 'archived' && invoice.archivedAt && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                    Archived: {formatDate(invoice.archivedAt)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                {activeTab === 'pending' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(invoice)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openArchiveConfirm(invoice.id!)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 dark:text-green-400"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteConfirm(invoice.id!)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteConfirm(invoice.id!)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreateEditInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingInvoice={editingInvoice}
        isLoading={isSaving}
      />

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'archive' ? 'Mark as Complete' : 'Delete Invoice'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'archive'
                ? 'Are you sure you want to mark this invoice as complete and move it to the archive?'
                : 'Are you sure you want to delete this invoice? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeConfirm} disabled={confirmDialog.isLoading}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.type === 'delete' ? 'danger' : 'default'}
              onClick={confirmAction}
              loading={confirmDialog.isLoading}
              disabled={confirmDialog.isLoading}
            >
              {confirmDialog.type === 'archive' ? 'Complete & Archive' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
