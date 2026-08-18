/**
 * Relieving Letter Page (Employee Self-Service)
 * Employees can ONLY view and download their OWN relieving letters.
 * Admins/Managers should use the admin page to manage other employees' letters.
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { RelievingLetter } from '@/types/relieving-letter.types';
import { relievingLetterService } from '@/services/relieving-letter.service';
import { generateRelievingLetterPDF } from '@/components/relieving-letter/RelievingLetterPDF';
import { RelievingLetterPreview } from '@/components/relieving-letter/RelievingLetterPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FileText, Eye, Download } from 'lucide-react';
export default function RelievingLetterPage() {
  return <RelievingLetterContent />;
}

function RelievingLetterContent() {
  const { user, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const [letters, setLetters] = useState<RelievingLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<RelievingLetter | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchLetters();
    }
  }, [user?.uid]);

  // Redirect non-admin/manager users with no letters
  useEffect(() => {
    if (
      user?.uid &&
      !loading &&
      !isAdmin &&
      !isManager &&
      letters.length === 0
    ) {
      toast.error('No relieving letter has been issued to your account');
      router.push('/dashboard');
    }
  }, [user, loading, letters.length, isAdmin, isManager, router]);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      if (!user?.uid) return;

      // API enforces employeeId = user.uid + accessGranted = true
      const data = await relievingLetterService.getLetters({ employeeId: user.uid });

      // Defense-in-depth: client-side filter
      const filteredData = data.filter(
        (letter) => letter.employeeId === user.uid && letter.accessGranted === true
      );

      if (data.length !== filteredData.length) {
        console.error(
          `[RelievingLetterPage] SECURITY VIOLATION: API returned ${data.length - filteredData.length} ` +
          `letter(s) that did not match the "own uid + access granted" contract for user ${user.uid}`
        );
      }

      // Sort by issueDate descending (most recent first)
      const sorted = [...filteredData].sort((a, b) => {
        const dateA = new Date(a.issueDate);
        const dateB = new Date(b.issueDate);
        return dateB.getTime() - dateA.getTime();
      });

      setLetters(sorted);
    } catch (error) {
      toast.error('Failed to fetch relieving letters');
      console.error('[RelievingLetterPage] Error fetching letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLetter = (letter: RelievingLetter) => {
    setSelectedLetter(letter);
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

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relieving Letter</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and download your relieving letter
        </p>
      </div>

      {/* Wait for user authentication */}
      {!user?.uid ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading your information...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Letters Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : letters.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Relieving Letter Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                    No relieving letter has been issued to your account yet. If you believe this is
                    an error, please contact your administrator.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Letter Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Issue Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {letters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {letter.letterNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(letter.issueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(letter.dateOfJoining)} — {formatDate(letter.dateOfLeaving)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLetter(letter)}
                            className="mr-2"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleDownloadPdf(letter)}
                            disabled={downloadingPdf}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Preview Dialog */}
          <Dialog open={!!selectedLetter} onOpenChange={() => setSelectedLetter(null)}>
            <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  Relieving Letter Preview
                </DialogTitle>
              </DialogHeader>

              {selectedLetter && (
                <div className="overflow-x-auto">
                  <RelievingLetterPreview letter={selectedLetter} />
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedLetter(null)}
                      className="w-full sm:w-auto"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => handleDownloadPdf(selectedLetter)}
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
        </>
      )}
    </div>
  );
}
