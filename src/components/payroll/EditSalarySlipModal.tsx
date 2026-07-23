/**
 * EditSalarySlipModal
 * Dialog for editing all fields of a salary slip (salary, deductions, attendance, etc.)
 * Template-driven: respects template section/field visibility and custom labels.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmployeeSalary, SalarySlipTemplate } from '@/types/payroll.types';

interface EditSalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditSalarySlipData) => Promise<void>;
  slip: EmployeeSalary | null;
  isLoading: boolean;
  template?: SalarySlipTemplate | null; // template for dynamic field/section rendering
}

const schema = z.object({
  grossSalary: z.number().min(0, 'Gross salary must be positive'),
  designation: z.string().optional(),
  department: z.string().optional(),
  pan: z.string().optional().nullable(),
  doj: z.string().optional().nullable(),
  // Attendance
  present: z.number().min(0),
  wfh: z.number().min(0),
  halfDay: z.number().min(0),
  paidLeave: z.number().min(0),
  leaveTaken: z.number().min(0),
  unpaidLeave: z.number().min(0),
  holiday: z.number().min(0),
  paidDays: z.number().min(0),
  // Salary breakup
  basic: z.number().min(0),
  hra: z.number().min(0),
  special: z.number().min(0),
  // Deductions
  epf: z.number().min(0),
  esi: z.number().min(0),
  professionalTax: z.number().min(0),
  tds: z.number().min(0),
  loanRecovery: z.number().min(0),
  otherDeduction: z.number().min(0),
});

type EditSalarySlipData = z.infer<typeof schema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function EditSalarySlipModal({
  isOpen,
  onClose,
  onSave,
  slip,
  isLoading,
  template,
}: EditSalarySlipModalProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EditSalarySlipData>({
    resolver: zodResolver(schema),
    defaultValues: {
      grossSalary: 0,
      designation: '',
      department: '',
      pan: null,
      doj: null,
      present: 0,
      wfh: 0,
      halfDay: 0,
      paidLeave: 0,
      leaveTaken: 0,
      unpaidLeave: 0,
      holiday: 0,
      paidDays: 0,
      basic: 0,
      hra: 0,
      special: 0,
      epf: 0,
      esi: 0,
      professionalTax: 0,
      tds: 0,
      loanRecovery: 0,
      otherDeduction: 0,
    },
  });

  // Watch deduction fields for live totals
  const basic = watch('basic');
  const hra = watch('hra');
  const special = watch('special');
  const epf = watch('epf');
  const esi = watch('esi');
  const professionalTax = watch('professionalTax');
  const tds = watch('tds');
  const loanRecovery = watch('loanRecovery');
  const otherDeduction = watch('otherDeduction');

  const totalEarnings = (basic || 0) + (hra || 0) + (special || 0);
  const totalDeductions =
    (epf || 0) + (esi || 0) + (professionalTax || 0) +
    (tds || 0) + (loanRecovery || 0) + (otherDeduction || 0);
  const netSalary = totalEarnings - totalDeductions;

  // Auto-set paidDays = present + wfh + (halfDay * 0.5) - unpaidLeave when attendance changes
  const present = watch('present');
  const wfh = watch('wfh');
  const halfDay = watch('halfDay');
  const unpaidLeave = watch('unpaidLeave');
  const paidDays = watch('paidDays');

  useEffect(() => {
    if (present !== undefined && wfh !== undefined && halfDay !== undefined && unpaidLeave !== undefined) {
      const computed = present + wfh + (halfDay * 0.5) - unpaidLeave;
      if (Math.abs(paidDays - computed) > 0.01) {
        setValue('paidDays', computed, { shouldValidate: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, wfh, halfDay, unpaidLeave, setValue]);

  useEffect(() => {
    if (isOpen && slip) {
      reset({
        grossSalary: slip.grossSalary || 0,
        designation: slip.designation || '',
        department: slip.department || '',
        pan: slip.pan || null,
        doj: slip.doj || null,
        present: slip.attendanceBreakdown?.present || 0,
        wfh: slip.attendanceBreakdown?.wfh || 0,
        halfDay: slip.attendanceBreakdown?.halfDay || 0,
        paidLeave: slip.attendanceBreakdown?.paidLeave || 0,
        leaveTaken: slip.attendanceBreakdown?.leaveTaken || 0,
        unpaidLeave: slip.attendanceBreakdown?.unpaidLeave || 0,
        holiday: slip.attendanceBreakdown?.holiday || 0,
        paidDays: slip.paidDays || 0,
        basic: slip.salaryBreakup?.basic || 0,
        hra: slip.salaryBreakup?.hra || 0,
        special: slip.salaryBreakup?.special || 0,
        epf: slip.salaryBreakup?.epf ?? 0,
        esi: slip.salaryBreakup?.esi ?? 0,
        professionalTax: slip.salaryBreakup?.professionalTax ?? 0,
        tds: slip.salaryBreakup?.tds ?? 0,
        loanRecovery: slip.salaryBreakup?.loanRecovery ?? 0,
        otherDeduction: slip.salaryBreakup?.otherDeduction ?? 0,
      });
    }
  }, [isOpen, slip, reset]);

  const onSubmit = async (data: EditSalarySlipData) => {
    try {
      await onSave(data);
      toast.success('Salary slip updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update salary slip');
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const inputClass =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm';

  // ── Template helpers ────────────────────────────────────────────────
  const isSectionVisible = (key: string) =>
    !template || template.sections.find((s) => s.key === key)?.visible !== false;

  const getSectionFields = (key: string) => {
    const section = template?.sections.find((s) => s.key === key);
    if (!section) return null;
    return section.fields.filter((f) => f.visible);
  };

  const fieldLabel = (sectionKey: string, fieldKey: string, fallback: string): string => {
    if (!template) return fallback;
    const fields = getSectionFields(sectionKey);
    if (!fields) return fallback;
    return fields.find((f) => f.key === fieldKey)?.label ?? fallback;
  };

  const sectionTitle = (key: string, fallback: string): string => {
    if (!template) return fallback;
    return template.sections.find((s) => s.key === key)?.title ?? fallback;
  };

  // ── Render helpers ─────────────────────────────────────────────────
  const renderNumberField = (
    fieldKey: string,
    sectionKey: string,
    fallbackLabel: string,
    opts?: { min?: number; step?: number; bg?: string; disabled?: boolean }
  ) => {
    if (template && !isSectionVisible(sectionKey)) return null;
    const fields = getSectionFields(sectionKey);
    if (fields && !fields.find((f) => f.key === fieldKey)) return null;
    return (
      <div key={fieldKey}>
        <Label htmlFor={fieldKey} className="text-xs">{fieldLabel(sectionKey, fieldKey, fallbackLabel)}</Label>
        <Input
          id={fieldKey}
          type="number"
          min={opts?.min ?? 0}
          step={opts?.step ?? 0.01}
          {...register(fieldKey as any, { valueAsNumber: true })}
          error={(errors as any)[fieldKey]?.message}
          disabled={isLoading}
          className={opts?.bg ? `${inputClass} ${opts.bg}` : inputClass}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[950px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            Edit Salary Slip — {slip ? `${slip.name}` : ''}
            {slip ? ` (${monthNames[slip.month]} ${slip.year})` : ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Employee Details ── */}
          {isSectionVisible('employeeDetails') && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {sectionTitle('employeeDetails', 'Employee Details')}
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {(!getSectionFields('employeeDetails') ||
                  getSectionFields('employeeDetails')!.some((f) => f.key === 'employeeId')) && (
                  <div>
                    <Label className="text-xs">{fieldLabel('employeeDetails', 'employeeId', 'Employee ID')}</Label>
                    <div className="text-sm font-medium text-gray-900 dark:text-white py-1.5">
                      {slip?.employeeCode || '-'}
                    </div>
                  </div>
                )}
                {(!getSectionFields('employeeDetails') ||
                  getSectionFields('employeeDetails')!.some((f) => f.key === 'name')) && (
                  <div>
                    <Label className="text-xs">{fieldLabel('employeeDetails', 'name', 'Employee Name')}</Label>
                    <div className="text-sm font-medium text-gray-900 dark:text-white py-1.5">
                      {slip?.name || '-'}
                    </div>
                  </div>
                )}
                {/* Read-only fields + editable fields from template */}
                {(() => {
                  const empSection = template?.sections.find((s) => s.key === 'employeeDetails');
                  const visibleFieldKeys = empSection
                    ? new Set(empSection.fields.filter((f) => f.visible).map((f) => f.key))
                    : new Set(['grossSalary', 'designation', 'department', 'pan', 'doj']);

                  return (
                    <>
                      {visibleFieldKeys.has('grossSalary') && (
                        <div>
                          <Label htmlFor="grossSalary" className="text-xs">
                            {fieldLabel('employeeDetails', 'grossSalary', 'Gross Salary')}
                          </Label>
                          <Input
                            id="grossSalary"
                            type="number"
                            placeholder="e.g., 50000"
                            {...register('grossSalary', { valueAsNumber: true })}
                            error={errors.grossSalary?.message}
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>
                      )}
                      {visibleFieldKeys.has('designation') && (
                        <div>
                          <Label htmlFor="designation" className="text-xs">
                            {fieldLabel('employeeDetails', 'designation', 'Designation')}
                          </Label>
                          <Input
                            id="designation"
                            placeholder="e.g., Software Engineer"
                            {...register('designation')}
                            error={errors.designation?.message}
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>
                      )}
                      {visibleFieldKeys.has('department') && (
                        <div>
                          <Label htmlFor="department" className="text-xs">
                            {fieldLabel('employeeDetails', 'department', 'Department')}
                          </Label>
                          <Input
                            id="department"
                            placeholder="e.g., Engineering"
                            {...register('department')}
                            error={errors.department?.message}
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>
                      )}
                      {visibleFieldKeys.has('pan') && (
                        <div>
                          <Label htmlFor="pan" className="text-xs">
                            {fieldLabel('employeeDetails', 'pan', 'PAN')}
                          </Label>
                          <Input
                            id="pan"
                            placeholder="ABCDE1234F"
                            {...register('pan')}
                            error={errors.pan?.message}
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>
                      )}
                      {visibleFieldKeys.has('doj') && (
                        <div>
                          <Label htmlFor="doj" className="text-xs">
                            {fieldLabel('employeeDetails', 'doj', 'Date of Joining')}
                          </Label>
                          <Input
                            id="doj"
                            type="date"
                            {...register('doj')}
                            error={errors.doj?.message}
                            disabled={isLoading}
                            className={inputClass}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Attendance ── */}
          {isSectionVisible('attendance') && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {sectionTitle('attendance', 'Attendance')}
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {(() => {
                  const attSection = template?.sections.find((s) => s.key === 'attendance');
                  const visibleFieldKeys = attSection
                    ? new Set(attSection.fields.filter((f) => f.visible).map((f) => f.key))
                    : new Set(['present', 'wfh', 'halfDay', 'holiday', 'paidLeave', 'leaveTaken', 'unpaidLeave', 'paidDays']);

                  const attFields: Array<{ key: string; label: string; opts?: { min?: number; step?: number; bg?: string } }> = [
                    { key: 'present', label: 'Present', opts: { min: 0, step: 1 } },
                    { key: 'wfh', label: 'WFH', opts: { min: 0, step: 1 } },
                    { key: 'halfDay', label: 'Half Day', opts: { min: 0, step: 1 } },
                    { key: 'holiday', label: 'Holiday', opts: { min: 0, step: 1 } },
                    { key: 'paidLeave', label: 'Paid Leave', opts: { min: 0, step: 1 } },
                    { key: 'leaveTaken', label: 'Leave Taken', opts: { min: 0, step: 1 } },
                    { key: 'unpaidLeave', label: 'Unpaid Leave', opts: { min: 0, step: 1 } },
                    { key: 'paidDays', label: 'Paid Days', opts: { min: 0, step: 0.5, bg: 'bg-blue-50 dark:bg-blue-900/20' } },
                  ];

                  return attFields
                    .filter((f) => visibleFieldKeys.has(f.key))
                    .map((f) => renderNumberField(f.key, 'attendance', f.label, f.opts));
                })()}
              </div>
            </div>
          )}

          {/* ── Earnings + Deductions side by side ── */}
          <div className="grid grid-cols-2 gap-4">
            {isSectionVisible('earnings') && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {sectionTitle('earnings', 'Earnings')}
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const sec = template?.sections.find((s) => s.key === 'earnings');
                    const visibleFieldKeys = sec
                      ? new Set(sec.fields.filter((f) => f.visible).map((f) => f.key))
                      : new Set(['basic', 'hra', 'special']);

                    const fields: Array<{ key: string; label: string }> = [
                      { key: 'basic', label: 'Basic' },
                      { key: 'hra', label: 'HRA' },
                      { key: 'special', label: 'Special Allowance' },
                    ];

                    return fields
                      .filter((f) => visibleFieldKeys.has(f.key))
                      .map((f) => renderNumberField(f.key, 'earnings', f.label));
                  })()}
                </div>
              </div>
            )}

            {isSectionVisible('deductions') && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {sectionTitle('deductions', 'Deductions')}
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const sec = template?.sections.find((s) => s.key === 'deductions');
                    const visibleFieldKeys = sec
                      ? new Set(sec.fields.filter((f) => f.visible).map((f) => f.key))
                      : new Set(['epf', 'esi', 'professionalTax', 'tds', 'loanRecovery', 'otherDeduction']);

                    const fields: Array<{ key: string; label: string }> = [
                      { key: 'epf', label: 'EPF' },
                      { key: 'esi', label: 'ESI / Health Insurance' },
                      { key: 'professionalTax', label: 'Professional Tax' },
                      { key: 'tds', label: 'TDS / Income Tax' },
                      { key: 'loanRecovery', label: 'Loan Recovery' },
                      { key: 'otherDeduction', label: 'Other Deduction' },
                    ];

                    return fields
                      .filter((f) => visibleFieldKeys.has(f.key))
                      .map((f) => renderNumberField(f.key, 'deductions', f.label));
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ── Live Totals ── */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Earnings</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalEarnings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Deductions</span>
                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDeductions)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900 dark:text-white font-semibold">Net Salary</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{formatCurrency(netSalary)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
