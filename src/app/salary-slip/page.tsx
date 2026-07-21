/**
 * Salary Slip Page (Self-Service)
 * Users can ONLY view and download their OWN salary slips.
 * Admins/Managers should use the payroll admin page to manage other employees' slips.
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { EmployeeSalary, PayrollSettings } from '@/types/payroll.types';
import { payrollService } from '@/services/payroll.service';
import { SalarySlipPreview } from '@/components/payroll/SalarySlipPreview';
import { generateSalarySlipPDF } from '@/components/payroll/SalarySlipPDF';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { useRouter } from 'next/navigation';

export default function SalarySlipPage() {
  const { user, isAdmin, isManager } = useEnhancedAuth();
  const router = useRouter();
  const [slips, setSlips] = useState<EmployeeSalary[]>([]);
  const [allSlips, setAllSlips] = useState<EmployeeSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<EmployeeSalary | null>(null);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    // Only fetch slips after we have user information
    if (user?.uid) {
      fetchAllSlips();
      fetchSettings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Apply month/year filter to already-loaded slips
  useEffect(() => {
    if (month !== undefined && year !== undefined) {
      const filtered = allSlips.filter(s => s.month === month && s.year === year);
      setSlips(filtered);
    } else {
      setSlips(allSlips);
    }
  }, [month, year, allSlips]);

  // Redirect non-admin users with no accessible slips
  useEffect(() => {
    if (
      user?.uid &&
      !loading &&
      !isAdmin &&
      !isManager &&
      allSlips.length === 0
    ) {
      toast.error('No salary slips available for your account');
      router.push('/dashboard');
    }
  }, [user, loading, allSlips.length, isAdmin, isManager]);

  const fetchAllSlips = async () => {
    setLoading(true);
    try {
      if (!user?.uid) {
        console.error('[SalarySlipPage] Cannot fetch slips without user uid');
        return;
      }

      console.log('[SalarySlipPage] Fetching salary slips for user:', user.uid);

      // Always fetch only the current user's own slips
      // The API enforces this server-side, but we pass employeeId explicitly for defense in depth
      const data = await payrollService.getSlips({ employeeId: user.uid });
      console.log('[SalarySlipPage] Received', data.length, 'slip(s)');

      // DEFENSIVE CHECK: Filter out any slips that don't belong to current user
      // Extra safety measure in case the API ever fails to enforce the filter
      const filteredData = data.filter(slip =>
        slip.employeeId === user.uid && slip.accessGranted === true
      );

      if (data.length !== filteredData.length) {
        console.error(
          `[SalarySlipPage] SECURITY VIOLATION: API returned ${data.length - filteredData.length} ` +
          `slip(s) not belonging to user ${user.uid}. This should never happen.`
        );
      }

      // Sort by year desc, then month desc (most recent first)
      const sorted = [...filteredData].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      setAllSlips(sorted);

      // Default filters to the most recent slip's period
      if (sorted.length > 0 && month === undefined && year === undefined) {
        setMonth(sorted[0].month);
        setYear(sorted[0].year);
      }
    } catch (error) {
      toast.error('Failed to fetch salary slips');
      console.error('[SalarySlipPage] Error fetching slips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const data = await payrollService.getSettings();
    if (data) {
      setSettings(data);
    }
  };

  const handleViewSlip = (slip: EmployeeSalary) => {
    setSelectedSlip(slip);
  };

  const handleDownloadPDF = async (slip: EmployeeSalary) => {
    let currentSettings = settings;
    if (!currentSettings) {
      // Retry fetching settings (in case initial fetch failed due to 403 or timing)
      const data = await payrollService.getSettings();
      if (data) {
        currentSettings = data;
        setSettings(data);
      }
    }
    if (!currentSettings) {
      toast.error('Payroll settings not configured');
      return;
    }
    try {
      await generateSalarySlipPDF(slip, currentSettings);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Slips</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and download your salary slips</p>
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
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Month
            </label>
            <select
              value={month ?? ''}
              onChange={(e) => setMonth(e.target.value === '' ? undefined : parseInt(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              <option value="">All Months</option>
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <select
              value={year ?? ''}
              onChange={(e) => setYear(e.target.value === '' ? undefined : parseInt(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              <option value="">All Years</option>
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button onClick={fetchAllSlips} className="mt-5">
            Refresh
          </Button>
          {(month !== undefined || year !== undefined) && (
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => { setMonth(undefined); setYear(undefined); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Slips Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : allSlips.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center justify-center py-12">
              <svg 
                className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Salary Slips Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                Your salary slips will appear here once they are generated and access is granted by your administrator.
              </p>
            </div>
          </div>
        ) : slips.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No salary slips for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Slip Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Month/Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paid Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    LOP Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {slips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {slip.slipNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {slip.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {monthNames[slip.month]} {slip.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {slip.paidDays}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {slip.lopDays}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{slip.salaryBreakup.netSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSlip(slip)}
                        className="mr-2"
                      >
                        View
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownloadPDF(slip)}
                      >
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
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Slip Preview</DialogTitle>
          </DialogHeader>
          {selectedSlip && settings ? (
            <div>
              <SalarySlipPreview slip={selectedSlip} settings={settings} />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSelectedSlip(null)}>
                  Close
                </Button>
                <Button onClick={() => handleDownloadPDF(selectedSlip)}>
                  Download PDF
                </Button>
              </div>
            </div>
          ) : selectedSlip && !settings ? (
            <div className="p-4 text-center text-gray-500">
              <p>Payroll settings are being loaded...</p>
              <p className="text-sm mt-2">Please try again in a moment.</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
