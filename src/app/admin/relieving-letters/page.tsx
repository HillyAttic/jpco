/**
 * Admin Relieving Letters Page
 * Admin page for managing relieving letters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RelievingLetter } from '@/types/relieving-letter.types';
import { relievingLetterService } from '@/services/relieving-letter.service';
import { generateRelievingLetterPDF } from '@/components/relieving-letter/RelievingLetterPDF';
import { RelievingLetterTable } from '@/components/relieving-letter/RelievingLetterTable';
import { RelievingLetterModal } from '@/components/relieving-letter/RelievingLetterModal';
import { RelievingLetterPreview } from '@/components/relieving-letter/RelievingLetterPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus } from 'lucide-react';

const TABS = [
  { value: 'letters', label: 'Letters', icon: FileText },
  { value: 'create', label: 'Create Letter', icon: Plus },
] as const;

export default function AdminRelievingLettersPage() {
  const { isAdmin } = useEnhancedAuth();
  const router = useRouter();
  const [letters, setLetters] = useState<RelievingLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('letters');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<RelievingLetter | null>(null);

  // Preview state
  const [previewLetter, setPreviewLetter] = useState<RelievingLetter | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin only.');
      router.push('/dashboard');
      return;
    }
    fetchLetters();
  }, [isAdmin, router]);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await relievingLetterService.getLetters({ includeAll: true });
      // Sort by createdAt descending (most recent first)
      const sorted = [...data].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setLetters(sorted);
    } catch (error) {
      toast.error('Failed to fetch letters');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateLetter = () => {
    setEditingLetter(null);
    setModalOpen(true);
  };

  const handleEditLetter = (letter: RelievingLetter) => {
    setEditingLetter(letter);
    setModalOpen(true);
  };

  const handleViewLetter = (letter: RelievingLetter) => {
    setPreviewLetter(letter);
  };

  const handleDownloadPdf = async (letter: RelievingLetter) => {
    setDownloadingPdf(true);
    try {
      await generateRelievingLetterPDF(letter);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleModalSave = () => {
    fetchLetters();
    setActiveTab('letters');
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relieving Letters</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and generate experience cum relieving letters for employees
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Letters Tab */}
        <TabsContent value="letters" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                All Letters ({letters.length})
              </h2>
              <Button onClick={handleCreateLetter} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Letter
              </Button>
            </div>
            <RelievingLetterTable
              letters={letters}
              onEdit={handleEditLetter}
              onView={handleViewLetter}
              onRefresh={fetchLetters}
              loading={loading}
            />
          </div>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Relieving Letter
            </h2>
            <RelievingLetterModal
              isOpen={true}
              onClose={() => setActiveTab('letters')}
              onSave={handleModalSave}
            />
          </div>
        </TabsContent>

      </Tabs>

      {/* Create/Edit Modal */}
      {activeTab !== 'create' && (
        <RelievingLetterModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingLetter(null);
          }}
          onSave={handleModalSave}
          letter={editingLetter}
        />
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewLetter} onOpenChange={() => setPreviewLetter(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Relieving Letter Preview — {previewLetter?.letterNumber}
            </DialogTitle>
          </DialogHeader>

          {previewLetter && (
            <div className="overflow-x-auto">
              <RelievingLetterPreview letter={previewLetter} />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPreviewLetter(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleDownloadPdf(previewLetter)}
                  disabled={downloadingPdf}
                  className="w-full sm:w-auto"
                >
                  {downloadingPdf ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
