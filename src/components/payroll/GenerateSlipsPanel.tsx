/**
 * GenerateSlipsPanel
 * Panel for selecting employees, month/year, previewing and generating salary slips
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { EmployeeSalary, PayrollSettings, SalaryCalculationResult, SalarySlipTemplate } from '@/types/payroll.types';
import { payrollService } from '@/services/payroll.service';
import { authenticatedFetch } from '@/lib/api-client';
import { SalarySlipPreview } from '@/components/payroll/SalarySlipPreview';
import { EditSalarySlipModal } from '@/components/payroll/EditSalarySlipModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load the attendance calendar modal
const AttendanceCalendarModal = dynamic(() => import('@/components/attendance/AttendanceCalendarModal').then(mod => ({ default: mod.AttendanceCalendarModal })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false,
});

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department?: string;
  designation?: string;
  grossSalary?: number;
}

interface GenerateSlipsPanelProps {
  settings: PayrollSettings | null;
  onGenerationComplete?: () => void;
  onNavigateToSettings?: () => void;
}

interface EmployeeWithCalculation extends Employee {
  selected: boolean;
  calculation?: SalaryCalculationResult | null;
  loading?: boolean;
}

export function GenerateSlipsPanel({ settings, onGenerationComplete, onNavigateToSettings }: GenerateSlipsPanelProps) {
  const [employees, setEmployees] = useState<EmployeeWithCalculation[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculating, setCalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [previewSlip, setPreviewSlip] = useState<EmployeeSalary | null>(null);
  const [editSlip, setEditSlip] = useState<EmployeeSalary | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [templates, setTemplates] = useState<SalarySlipTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Attendance calendar modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState<{ id: string; name: string } | null>(null);

  // Ref to track which year-month's access config has been applied (prevents re-applying on re-renders)
  const appliedConfigKey = useRef<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchEmployees();
    fetchTemplates();
  }, []);

  // Reset the ref when period changes so config gets reapplied
  useEffect(() => {
    appliedConfigKey.current = null;
  }, [month, year]);

  // Apply saved access config when settings or period changes (race-condition-safe)
  useEffect(() => {
    const key = `${year}-${month}`;

    // Guard: need settings, employees, and haven't applied this period yet
    if (!settings?.accessConfig || employees.length === 0) return;
    if (appliedConfigKey.current === key) return;

    const savedConfig = settings.accessConfig[key] || {};
    setEmployees(prev =>
      prev.map(emp => ({
        ...emp,
        selected: savedConfig[emp.id] ?? false,
      }))
    );

    appliedConfigKey.current = key;
  }, [settings?.accessConfig, month, year]);

  // Auto-calculate salaries when settings are available and employees are loaded
  useEffect(() => {
    if (settings && employees.length > 0 && !calculating && !generating) {
      // Check if any employee already has a calculation
      const hasAnyCalculation = employees.some(emp => emp.calculation);
      if (!hasAnyCalculation) {
        handleCalculateAll();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, employees]);

  const fetchTemplates = async () => {
    try {
      const list = await payrollService.getTemplates();
      setTemplates(list);
      // Default to the first template if available
      if (list.length > 0) {
        setSelectedTemplateId(list[0].id ?? '');
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await authenticatedFetch('/api/employees?status=active');
      if (response.ok) {
        const json = await response.json();
        const list: Employee[] = Array.isArray(json) ? json : json.data ?? [];

        // Apply saved access config immediately when loading employees (only if settings already available)
        const key = `${year}-${month}`;
        const savedConfig = settings?.accessConfig?.[key];

        setEmployees(
          list
            .map(emp => ({
              ...emp,
              selected: savedConfig ? (savedConfig[emp.id] ?? false) : false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );

        // Only mark as applied if we actually had config data to apply
        if (savedConfig) {
          appliedConfigKey.current = key;
        }
      }
    } catch (error) {
      toast.error('Failed to fetch employees');
      console.error(error);
    }
  };

  const handleCalculateAll = async () => {
    if (!settings) {
      toast.error('Please configure payroll settings first. Go to the Payroll Settings tab.');
      return;
    }

    setCalculating(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      const updatedEmployees = [...employees];
      for (let i = 0; i < updatedEmployees.length; i++) {
        updatedEmployees[i] = { ...updatedEmployees[i], loading: true };
        setEmployees([...updatedEmployees]);

        try {
          const result = await payrollService.calculateSalary(
            updatedEmployees[i].id,
            month,
            year
          );
          updatedEmployees[i] = {
            ...updatedEmployees[i],
            calculation: result,
            loading: false,
          };
          successCount++;
        } catch (error) {
          updatedEmployees[i] = {
            ...updatedEmployees[i],
            calculation: null,
            loading: false,
          };
          errorCount++;
          console.error(`Failed to calculate for ${updatedEmployees[i].name}:`, error);
        }
      }
      setEmployees(updatedEmployees);
      if (successCount > 0 && errorCount === 0) {
        toast.success(`Calculated salaries for ${successCount} employee(s)`);
      } else if (successCount > 0) {
        toast.warn(`Calculated ${successCount} of ${updatedEmployees.length}. ${errorCount} failed — check employee salary config.`);
      } else {
        toast.error(`Failed to calculate any salaries. Ensure employees have gross salary configured.`);
      }
    } catch (error) {
      toast.error('Failed to calculate salaries');
      console.error(error);
    } finally {
      setCalculating(false);
    }
  };

  const handleToggleAccess = async (id: string) => {
    // Get the new selected state before toggling
    const emp = employees.find(e => e.id === id);
    const newState = !emp?.selected;

    // Optimistic local update
    setEmployees(prev =>
      prev.map(e => (e.id === id ? { ...e, selected: newState } : e))
    );

    // Then persist to Firestore
    try {
      const key = `${year}-${month}`;
      const currentConfig = settings?.accessConfig || {};
      const monthConfig = currentConfig[key] || {};
      const newAccessConfig = {
        ...currentConfig,
        [key]: {
          ...monthConfig,
          [id]: newState,
        },
      };

      // 1. Persist to settings
      await payrollService.saveAccessConfig(newAccessConfig);

      // 2. Update accessGranted on existing slip if one exists
      console.log(`[GenerateSlipsPanel] handleToggleAccess - Looking for slip: employeeId=${id}, month=${month}, year=${year}`);

      // Try to find the slip with includeAll=true (bypasses accessGranted filter)
      const existingSlips = await payrollService.getSlips({ employeeId: id, month, year, includeAll: true });
      console.log(`[GenerateSlipsPanel] handleToggleAccess - Found ${existingSlips.length} slip(s)`, existingSlips);

      if (existingSlips.length > 0 && existingSlips[0].id) {
        const slipId = existingSlips[0].id;
        console.log(`[GenerateSlipsPanel] handleToggleAccess - Updating slip ${slipId} to accessGranted=${newState}`);

        const success = await payrollService.updateSlipAccess(slipId, newState);
        console.log(`[GenerateSlipsPanel] handleToggleAccess - Update result: ${success}`);

        if (!success) {
          console.error(`[GenerateSlipsPanel] handleToggleAccess - Failed to update slip access`);
          toast.error('Failed to update slip access');
        } else {
          toast.success(`Access ${newState ? 'granted' : 'revoked'} for ${emp?.name || 'employee'}`);
        }
      } else {
        console.warn(`[GenerateSlipsPanel] handleToggleAccess - No slip found for employee ${id}. The slip may not have been generated yet.`);
        toast.warn(`No slip found for this period. Generate the slip first.`);
      }
    } catch (error) {
      console.error('Failed to save access config:', error);
      toast.error('Failed to save access settings');
    }
  };

  const handleToggleAll = async () => {
    const allEnabled = employees.every(emp => emp.selected);
    const newState = !allEnabled;

    // Optimistic local update
    setEmployees(prev =>
      prev.map(emp => ({ ...emp, selected: newState }))
    );

    try {
      const key = `${year}-${month}`;
      const currentConfig = settings?.accessConfig || {};
      const monthConfig = currentConfig[key] || {};

      // Build config with all employees set to newState
      const newAccessConfig = {
        ...currentConfig,
        [key]: {
          ...monthConfig,
          ...Object.fromEntries(employees.map(emp => [emp.id, newState])),
        },
      };

      // 1. Persist to settings
      await payrollService.saveAccessConfig(newAccessConfig);

      // 2. Update accessGranted on existing slips for this period
      const existingSlips = await payrollService.getSlips({ month, year, includeAll: true });
      if (existingSlips.length > 0) {
        const updates = existingSlips
          .filter(slip => slip.id)
          .map(slip => ({ slipId: slip.id!, accessGranted: newState }));

        if (updates.length > 0) {
          await payrollService.batchUpdateSlipAccess(updates);
        }
      }
    } catch (error) {
      console.error('Failed to update all toggles:', error);
      toast.error('Failed to update all toggles');
    }
  };

  const handlePreview = (employee: EmployeeWithCalculation) => {
    if (!employee.calculation || !settings) return;

    const slip: EmployeeSalary = {
      employeeId: employee.id,
      name: employee.name,
      employeeCode: employee.employeeId,
      designation: employee.designation || '',
      department: employee.department || '',
      doj: null,
      pan: null,
      grossSalary: employee.grossSalary || 0,
      month,
      year,
      totalDaysInMonth: employee.calculation.totalDaysInMonth,
      paidDays: employee.calculation.paidDays,
      lopDays: employee.calculation.lopDays,
      attendanceBreakdown: employee.calculation.attendanceBreakdown,
      salaryBreakup: employee.calculation.salaryBreakup,
      slipNumber: `SAL-${year}${String(month + 1).padStart(2, '0')}-${employee.employeeId}`,
      generatedBy: '',
      accessGranted: true,
    };

    setPreviewSlip(slip);
  };

  const handleEdit = async (employee: EmployeeWithCalculation) => {
    if (!settings) {
      toast.error('Please configure payroll settings first');
      return;
    }

    // Try to find an existing saved slip for this employee/month/year
    try {
      const existingSlips = await payrollService.getSlips({
        employeeId: employee.id,
        month,
        year,
      });

      if (existingSlips.length > 0) {
        // Use the existing saved slip
        setEditSlip(existingSlips[0]);
        return;
      }
    } catch (error) {
      console.error('Failed to check for existing slip:', error);
    }

    // If no saved slip, build a synthetic one from the calculation (if available)
    if (employee.calculation) {
      const slip: EmployeeSalary = {
        employeeId: employee.id,
        name: employee.name,
        employeeCode: employee.employeeId,
        designation: employee.designation || '',
        department: employee.department || '',
        doj: null,
        pan: null,
        grossSalary: employee.grossSalary || 0,
        month,
        year,
        totalDaysInMonth: employee.calculation.totalDaysInMonth,
        paidDays: employee.calculation.paidDays,
        lopDays: employee.calculation.lopDays,
        attendanceBreakdown: employee.calculation.attendanceBreakdown,
        salaryBreakup: employee.calculation.salaryBreakup,
        slipNumber: `SAL-${year}${String(month + 1).padStart(2, '0')}-${employee.employeeId}`,
        generatedBy: '',
        accessGranted: true,
      };
      setEditSlip(slip);
    } else {
      toast.error('Please calculate salary first before editing');
    }
  };

  const handleSaveEdit = async (data: {
    grossSalary: number;
    designation?: string;
    department?: string;
    pan?: string | null;
    doj?: string | null;
    present: number;
    wfh: number;
    halfDay: number;
    paidLeave: number;
    lopLeave: number;
    holiday: number;
    paidDays: number;
    lopDays: number;
    basic: number;
    hra: number;
    special: number;
    epf: number;
    esi: number;
    professionalTax: number;
    tds: number;
    loanRecovery: number;
    otherDeduction: number;
  }) => {
    if (!editSlip) return;

    setEditLoading(true);
    try {
      const totalDeductions =
        data.epf + data.esi + data.professionalTax +
        data.tds + data.loanRecovery + data.otherDeduction;
      const totalEarnings = data.basic + data.hra + data.special;
      const netSalary = totalEarnings - totalDeductions;

      const slipId = editSlip.id;

      if (slipId) {
        // Slip already exists — update it
        const success = await payrollService.updateSlip(slipId, {
          grossSalary: data.grossSalary,
          paidDays: data.paidDays,
          lopDays: data.lopDays,
          designation: data.designation || '',
          department: data.department || '',
          pan: data.pan || null,
          doj: data.doj || null,
          salaryBreakup: {
            basic: data.basic,
            hra: data.hra,
            special: data.special,
            totalDeductions,
            netSalary,
          },
          attendanceBreakdown: {
            present: data.present,
            wfh: data.wfh,
            approvedLeave: data.paidLeave,
            unapprovedLeave: data.lopLeave,
            halfDay: data.halfDay,
            holiday: data.holiday,
            paidLeave: data.paidLeave,
            lopLeave: data.lopLeave,
            paidDays: data.paidDays,
            lopDays: data.lopDays,
          },
        });
        if (!success) throw new Error('Update failed');

        // Update the employee list to reflect new gross salary
        setEmployees(prev =>
          prev.map(emp =>
            emp.id === editSlip.employeeId
              ? { ...emp, grossSalary: data.grossSalary }
              : emp
          )
        );
      } else {
        // No saved slip yet — generate one for this employee then update it
        const response = await authenticatedFetch('/api/payroll/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeIds: [editSlip.employeeId],
            month,
            year,
            accessMap: { [editSlip.employeeId]: true },
          }),
        });

        if (!response.ok) throw new Error('Failed to generate slip');
        const result = await response.json();
        const generatedSlip = result.slips?.[0];
        if (!generatedSlip) throw new Error('No slip returned');

        // Now update it with the edited values
        const success = await payrollService.updateSlip(generatedSlip.id, {
          grossSalary: data.grossSalary,
          paidDays: data.paidDays,
          lopDays: data.lopDays,
          designation: data.designation || '',
          department: data.department || '',
          pan: data.pan || null,
          doj: data.doj || null,
          salaryBreakup: {
            basic: data.basic,
            hra: data.hra,
            special: data.special,
            totalDeductions,
            netSalary,
          },
          attendanceBreakdown: {
            present: data.present,
            wfh: data.wfh,
            approvedLeave: data.paidLeave,
            unapprovedLeave: data.lopLeave,
            halfDay: data.halfDay,
            holiday: data.holiday,
            paidLeave: data.paidLeave,
            lopLeave: data.lopLeave,
            paidDays: data.paidDays,
            lopDays: data.lopDays,
          },
        });
        if (!success) throw new Error('Update failed');

        setEmployees(prev =>
          prev.map(emp =>
            emp.id === editSlip.employeeId
              ? { ...emp, grossSalary: data.grossSalary }
              : emp
          )
        );
      }
    } catch (error) {
      throw error;
    } finally {
      setEditLoading(false);
    }
  };

  const handleGenerate = async () => {
    const selectedEmployees = employees.filter(emp => emp.selected && emp.calculation);
    const selectedWithoutCalculation = employees.filter(emp => emp.selected && !emp.calculation);

    if (selectedEmployees.length === 0) {
      toast.error('Please enable access for at least one employee with calculations');
      return;
    }

    // Warn if some selected employees don't have calculations
    if (selectedWithoutCalculation.length > 0) {
      const names = selectedWithoutCalculation.map(emp => emp.name).join(', ');
      toast.warn(`${selectedWithoutCalculation.length} employee(s) enabled but missing calculations: ${names}. Their slips will NOT be generated.`);
    }

    if (!confirm(`Generate salary slips for ${selectedEmployees.length} employee(s)?`)) {
      return;
    }

    setGenerating(true);
    try {
      const employeeIds = selectedEmployees.map(emp => emp.id);
      const accessMap: Record<string, boolean> = {};
      employees.forEach(emp => {
        accessMap[emp.id] = emp.selected;
      });

      console.log('[GenerateSlipsPanel] Generating slips for employeeIds:', employeeIds);
      console.log('[GenerateSlipsPanel] accessMap:', JSON.stringify(accessMap));

      const response = await authenticatedFetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds, month, year, accessMap }),
      });

      if (response.ok) {
        const data = await response.json();
        const slips = data.slips;
        toast.success(`Successfully generated ${slips.length} salary slip(s)`);
        onGenerationComplete?.();
        setEmployees(prev => prev.map(emp => ({ ...emp, selected: false })));
      } else {
        toast.error('Failed to generate salary slips');
      }
    } catch (error) {
      toast.error('Failed to generate salary slips');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCleanupSlips = async () => {
    const confirmMessage = `⚠️ WARNING: This will DELETE all generated salary slips for ${monthNames[month]} ${year}.\n\nThis action cannot be undone!\n\nAre you sure you want to proceed?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    if (!confirm('FINAL CONFIRMATION: Delete all slips for this period?')) {
      return;
    }

    setCleaning(true);
    try {
      console.log(`[GenerateSlipsPanel] Cleaning up slips for month=${month}, year=${year}`);
      
      const response = await authenticatedFetch('/api/payroll/cleanup-slips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully deleted ${data.deletedCount} salary slip(s)`);
        onGenerationComplete?.();
        // Reset selections
        setEmployees(prev => prev.map(emp => ({ ...emp, selected: false })));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to clean up salary slips');
      }
    } catch (error) {
      toast.error('Failed to clean up salary slips');
      console.error(error);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings not configured warning */}
      {!settings && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Payroll settings not configured
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              You need to configure payroll settings (company info, salary breakup percentages) before you can calculate or preview salary slips.
            </p>
            {onNavigateToSettings && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                onClick={onNavigateToSettings}
              >
                Go to Payroll Settings
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Month/Year Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Period</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleCalculateAll} loading={calculating} disabled={!settings}>
            {calculating ? 'Calculating...' : 'Calculate All'}
          </Button>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Employees ({employees.length})
            </h3>
            <Button variant="outline" size="sm" onClick={handleToggleAll}>
              {employees.every(emp => emp.selected) ? 'Disable All' : 'Enable All'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Access
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Gross Salary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Paid Days
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {employees.map((employee, index) => (
                <tr
                  key={employee.id}
                  className={employee.selected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                >
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleAccess(employee.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        employee.selected
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      title={
                        employee.selected
                          ? `Revoke access for ${employee.name}`
                          : `Grant access to ${employee.name}`
                      }
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          employee.selected ? 'translate-x-4' : ''
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedEmployeeForAttendance({ id: employee.id, name: employee.name });
                        setShowAttendanceModal(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left text-sm"
                    >
                      {employee.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {employee.employeeId}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {employee.department || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {employee.grossSalary ? `₹${employee.grossSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {employee.calculation
                      ? `₹${employee.calculation.salaryBreakup.netSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                      : employee.loading
                      ? 'Calculating...'
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {employee.calculation ? employee.calculation.paidDays : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(employee)}
                        disabled={!employee.calculation}
                      >
                        Preview
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-between items-center gap-4">
        <Button
          onClick={handleCleanupSlips}
          loading={cleaning}
          size="lg"
          variant="destructive"
          disabled={generating || calculating}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {cleaning ? 'Cleaning Up...' : 'Clean Up Slips'}
        </Button>
        
        <Button
          onClick={handleGenerate}
          loading={generating}
          size="lg"
          disabled={!employees.some(emp => emp.selected)}
        >
          {generating ? 'Generating...' : `Generate & Save (${employees.filter(emp => emp.selected).length} slips)`}
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewSlip} onOpenChange={() => setPreviewSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Salary Slip Preview</DialogTitle>
          </DialogHeader>

          {/* Template Selector */}
          {templates.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Slip Template:
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {previewSlip && settings && (
            <SalarySlipPreview
              slip={previewSlip}
              settings={settings}
              template={templates.find((t) => t.id === selectedTemplateId) ?? null}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance Calendar Modal */}
      {selectedEmployeeForAttendance && (
        <AttendanceCalendarModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedEmployeeForAttendance(null);
          }}
          employeeId={selectedEmployeeForAttendance.id}
          employeeName={selectedEmployeeForAttendance.name}
        />
      )}

      {/* Edit Salary Slip Modal */}
      <EditSalarySlipModal
        isOpen={!!editSlip}
        onClose={() => setEditSlip(null)}
        onSave={handleSaveEdit}
        slip={editSlip}
        isLoading={editLoading}
      />
    </div>
  );
}
