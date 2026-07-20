/**
 * EditSalarySlipModal
 * Dialog for editing all fields of a salary slip (salary, deductions, attendance, etc.)
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
import { EmployeeSalary } from '@/types/payroll.types';

interface EditSalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditSalarySlipData) => Promise<void>;
  slip: EmployeeSalary | null;
  isLoading: boolean;
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
  lopLeave: z.number().min(0),
  holiday: z.number().min(0),
  paidDays: z.number().min(0),
  lopDays: z.number().min(0),
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
    minimumFractionDigits: 2,
  }).format(amount);

export function EditSalarySlipModal({
  isOpen,
  onClose,
  onSave,
  slip,
  isLoading,
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
      lopLeave: 0,
      holiday: 0,
      paidDays: 0,
      lopDays: 0,
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

  // Auto-set paidDays = present + wfh + (halfDay * 0.5) when attendance changes
  const present = watch('present');
  const wfh = watch('wfh');
  const halfDay = watch('halfDay');
  const paidDays = watch('paidDays');

  useEffect(() => {
    if (present !== undefined && wfh !== undefined && halfDay !== undefined) {
      const computed = present + wfh + (halfDay * 0.5);
      if (Math.abs(paidDays - computed) > 0.01) {
        setValue('paidDays', computed, { shouldValidate: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, wfh, halfDay, setValue]);

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
        lopLeave: slip.attendanceBreakdown?.lopLeave || 0,
        holiday: slip.attendanceBreakdown?.holiday || 0,
        paidDays: slip.paidDays || 0,
        lopDays: slip.lopDays || 0,
        basic: slip.salaryBreakup?.basic || 0,
        hra: slip.salaryBreakup?.hra || 0,
        special: slip.salaryBreakup?.special || 0,
        epf: 0,
        esi: 0,
        professionalTax: 0,
        tds: 0,
        loanRecovery: 0,
        otherDeduction: 0,
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
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Employee Details
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Employee ID</Label>
                <div className="text-sm font-medium text-gray-900 dark:text-white py-1.5">
                  {slip?.employeeCode || '-'}
                </div>
              </div>
              <div>
                <Label className="text-xs">Employee Name</Label>
                <div className="text-sm font-medium text-gray-900 dark:text-white py-1.5">
                  {slip?.name || '-'}
                </div>
              </div>
              <div>
                <Label htmlFor="grossSalary" className="text-xs">Gross Salary</Label>
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
              <div>
                <Label htmlFor="designation" className="text-xs">Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g., Software Engineer"
                  {...register('designation')}
                  error={errors.designation?.message}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="department" className="text-xs">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Engineering"
                  {...register('department')}
                  error={errors.department?.message}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="pan" className="text-xs">PAN</Label>
                <Input
                  id="pan"
                  placeholder="ABCDE1234F"
                  {...register('pan')}
                  error={errors.pan?.message}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="doj" className="text-xs">Date of Joining</Label>
                <Input
                  id="doj"
                  type="date"
                  {...register('doj')}
                  error={errors.doj?.message}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ── Attendance ── */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Attendance
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="present" className="text-xs">Present</Label>
                <Input id="present" type="number" min={0} step={1}
                  {...register('present', { valueAsNumber: true })}
                  error={errors.present?.message} disabled={isLoading} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="wfh" className="text-xs">WFH</Label>
                <Input id="wfh" type="number" min={0} step={1}
                  {...register('wfh', { valueAsNumber: true })}
                  error={errors.wfh?.message} disabled={isLoading} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="halfDay" className="text-xs">Half Day</Label>
                <Input id="halfDay" type="number" min={0} step={1}
                  {...register('halfDay', { valueAsNumber: true })}
                  error={errors.halfDay?.message} disabled={isLoading} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="holiday" className="text-xs">Holiday</Label>
                <Input id="holiday" type="number" min={0} step={1}
                  {...register('holiday', { valueAsNumber: true })}
                  error={errors.holiday?.message} disabled={isLoading} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="paidLeave" className="text-xs">Paid Leave</Label>
                <Input id="paidLeave" type="number" min={0} step={1}
                  {...register('paidLeave', { valueAsNumber: true })}
                  error={errors.paidLeave?.message} disabled={isLoading} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="lopLeave" className="text-xs">LOP Leave</Label>
                <Input id="lopLeave" type="number" min={0} step={1}
                  {...register('lopLeave', { valueAsNumber: true })}
                  error={errors.lopLeave?.message} disabled={isLoading} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="paidDays" className="text-xs">Paid Days</Label>
                <Input id="paidDays" type="number" min={0} step={0.5}
                  {...register('paidDays', { valueAsNumber: true })}
                  error={errors.paidDays?.message} disabled={isLoading}
                  className={`${inputClass} bg-blue-50 dark:bg-blue-900/20`} />
              </div>
              <div>
                <Label htmlFor="lopDays" className="text-xs">LOP Days</Label>
                <Input id="lopDays" type="number" min={0} step={1}
                  {...register('lopDays', { valueAsNumber: true })}
                  error={errors.lopDays?.message} disabled={isLoading} className={inputClass} />
              </div>
            </div>
          </div>

          {/* ── Earnings + Deductions side by side ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Earnings
              </h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="basic" className="text-xs">Basic</Label>
                  <Input id="basic" type="number" min={0} step={0.01}
                    {...register('basic', { valueAsNumber: true })}
                    error={errors.basic?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="hra" className="text-xs">HRA</Label>
                  <Input id="hra" type="number" min={0} step={0.01}
                    {...register('hra', { valueAsNumber: true })}
                    error={errors.hra?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="special" className="text-xs">Special Allowance</Label>
                  <Input id="special" type="number" min={0} step={0.01}
                    {...register('special', { valueAsNumber: true })}
                    error={errors.special?.message} disabled={isLoading} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Deductions
              </h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="epf" className="text-xs">EPF</Label>
                  <Input id="epf" type="number" min={0} step={0.01}
                    {...register('epf', { valueAsNumber: true })}
                    error={errors.epf?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="esi" className="text-xs">ESI / Health Insurance</Label>
                  <Input id="esi" type="number" min={0} step={0.01}
                    {...register('esi', { valueAsNumber: true })}
                    error={errors.esi?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="professionalTax" className="text-xs">Professional Tax</Label>
                  <Input id="professionalTax" type="number" min={0} step={0.01}
                    {...register('professionalTax', { valueAsNumber: true })}
                    error={errors.professionalTax?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="tds" className="text-xs">TDS / Income Tax</Label>
                  <Input id="tds" type="number" min={0} step={0.01}
                    {...register('tds', { valueAsNumber: true })}
                    error={errors.tds?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="loanRecovery" className="text-xs">Loan Recovery</Label>
                  <Input id="loanRecovery" type="number" min={0} step={0.01}
                    {...register('loanRecovery', { valueAsNumber: true })}
                    error={errors.loanRecovery?.message} disabled={isLoading} className={inputClass} />
                </div>
                <div>
                  <Label htmlFor="otherDeduction" className="text-xs">Other Deduction</Label>
                  <Input id="otherDeduction" type="number" min={0} step={0.01}
                    {...register('otherDeduction', { valueAsNumber: true })}
                    error={errors.otherDeduction?.message} disabled={isLoading} className={inputClass} />
                </div>
              </div>
            </div>
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
