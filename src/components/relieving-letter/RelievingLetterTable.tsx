/**
 * Relieving Letter Table Component
 * Admin table for listing and managing relieving letters
 */

'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RelievingLetter } from '@/types/relieving-letter.types';
import { format } from 'date-fns';
import { Search, Edit, Trash2, Eye, FileText } from 'lucide-react';

interface RelievingLetterTableProps {
  letters: RelievingLetter[];
  onEdit: (letter: RelievingLetter) => void;
  onView: (letter: RelievingLetter) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function RelievingLetterTable({
  letters,
  onEdit,
  onView,
  onRefresh,
  loading,
}: RelievingLetterTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<RelievingLetter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const filteredLetters = letters.filter((letter) => {
    const q = searchQuery.toLowerCase();
    return (
      letter.employeeName?.toLowerCase().includes(q) ||
      letter.letterNumber?.toLowerCase().includes(q) ||
      letter.employeeDesignation?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (letter: RelievingLetter) => {
    if (!letter.id) return;
    setDeleting(true);
    try {
      const { relievingLetterService } = await import('@/services/relieving-letter.service');
      const success = await relievingLetterService.deleteLetter(letter.id);
      if (success) {
        toast.success('Letter deleted successfully');
        onRefresh();
      } else {
        toast.error('Failed to delete letter');
      }
    } catch {
      toast.error('Failed to delete letter');
    } finally {
      setDeleting(false);
      setDeleteDialog(null);
    }
  };

  const handleToggleAccess = async (letter: RelievingLetter) => {
    if (!letter.id) return;
    setTogglingId(letter.id);
    try {
      const { relievingLetterService } = await import('@/services/relieving-letter.service');
      const result = await relievingLetterService.toggleAccess(letter.id, !letter.accessGranted);
      if (result?.success) {
        if (result.notificationSent) {
          toast.success(`Access ${!letter.accessGranted ? 'granted' : 'revoked'}. Employee notified.`);
        } else {
          toast.success(`Access ${!letter.accessGranted ? 'granted' : 'revoked'}.`);
        }
        onRefresh();
      } else {
        toast.error('Failed to toggle access');
      }
    } catch {
      toast.error('Failed to toggle access');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, letter number, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : filteredLetters.length === 0 ? (
        <div className="p-12 text-center">
          <div className="flex flex-col items-center justify-center py-8">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Relieving Letters
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
              {searchQuery
                ? 'No letters match your search. Try a different query.'
                : 'No relieving letters have been created yet. Click "Create Letter" to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Letter No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Joining Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Last Working
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Access
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredLetters.map((letter) => (
                <tr key={letter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {letter.letterNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {letter.employeeName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {letter.employeeDesignation}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {formatDate(letter.dateOfJoining)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {formatDate(letter.dateOfLeaving)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAccess(letter)}
                      disabled={togglingId === letter.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        letter.accessGranted ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      } ${togglingId === letter.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          letter.accessGranted ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(letter)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(letter)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog(letter)}
                        title="Delete"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Relieving Letter</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete the relieving letter{' '}
            <strong>{deleteDialog?.letterNumber}</strong> for{' '}
            <strong>{deleteDialog?.employeeName}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
