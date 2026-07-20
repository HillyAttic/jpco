/**
 * PayrollSettingsForm
 * Form for configuring company payroll settings
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { payrollService } from '@/services/payroll.service';
import { PayrollSettings } from '@/types/payroll.types';

interface PayrollSettingsFormProps {
  onSaveSuccess?: () => void;
}

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().min(1, 'Company address is required'),
  logoUrl: z.string().optional().nullable(),
  basicPercentage: z.number().min(0).max(100, 'Cannot exceed 100'),
  hraPercentage: z.number().min(0).max(100, 'Cannot exceed 100'),
  specialPercentage: z.number().min(0).max(100, 'Cannot exceed 100'),
  allowedPaidLeaves: z.number().min(0).int('Must be a whole number'),
  includePaidLeavesInPaidDays: z.boolean(),
  footerNote: z.string(),
});

type FormData = z.infer<typeof schema>;

export function PayrollSettingsForm({ onSaveSuccess }: PayrollSettingsFormProps) {
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '',
      companyAddress: '',
      logoUrl: null,
      basicPercentage: 0,
      hraPercentage: 0,
      specialPercentage: 0,
      allowedPaidLeaves: 0,
      includePaidLeavesInPaidDays: false,
      footerNote: 'This is a computer generated statement, does not require signature.',
    },
  });

  const basicPercentage = watch('basicPercentage');
  const hraPercentage = watch('hraPercentage');
  const specialPercentage = watch('specialPercentage');
  const totalPercentage = (basicPercentage || 0) + (hraPercentage || 0) + (specialPercentage || 0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const settings = await payrollService.getSettings();
    if (settings) {
      reset({
        companyName: settings.companyName || '',
        companyAddress: settings.companyAddress || '',
        logoUrl: settings.logoUrl || null,
        basicPercentage: settings.basicPercentage || 0,
        hraPercentage: settings.hraPercentage || 0,
        specialPercentage: settings.specialPercentage || 0,
        allowedPaidLeaves: settings.allowedPaidLeaves || 0,
        includePaidLeavesInPaidDays: settings.includePaidLeavesInPaidDays ?? false,
        footerNote: settings.footerNote || 'This is a computer generated statement, does not require signature.',
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    if (totalPercentage !== 100) {
      toast.error(`Percentages must sum to 100. Current total: ${totalPercentage}%`);
      return;
    }

    try {
      // Strip undefined values to match PayrollSettings type (logoUrl: string | null, not undefined)
      const cleaned = { ...data, logoUrl: data.logoUrl ?? null };
      const success = await payrollService.saveSettings(cleaned);
      if (success) {
        toast.success('Payroll settings saved successfully');
        onSaveSuccess?.();
      } else {
        toast.error('Failed to save payroll settings');
      }
    } catch (error) {
      toast.error('Failed to save payroll settings');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h3>

        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Enter company name"
            {...register('companyName')}
            error={errors.companyName?.message}
          />
        </div>

        <div>
          <Label htmlFor="companyAddress">Company Address</Label>
          <Textarea
            id="companyAddress"
            placeholder="Enter company address"
            rows={3}
            {...register('companyAddress')}
            error={errors.companyAddress?.message}
          />
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input
            id="logoUrl"
            placeholder="https://example.com/logo.png"
            {...register('logoUrl')}
            error={errors.logoUrl?.message}
          />
        </div>
      </div>

      {/* Salary Percentages */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Salary Breakup Percentages</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="basicPercentage">Basic (%)</Label>
            <Input
              id="basicPercentage"
              type="number"
              placeholder="e.g., 40"
              {...register('basicPercentage', { valueAsNumber: true })}
              error={errors.basicPercentage?.message}
            />
          </div>

          <div>
            <Label htmlFor="hraPercentage">HRA (%)</Label>
            <Input
              id="hraPercentage"
              type="number"
              placeholder="e.g., 20"
              {...register('hraPercentage', { valueAsNumber: true })}
              error={errors.hraPercentage?.message}
            />
          </div>

          <div>
            <Label htmlFor="specialPercentage">Special (%)</Label>
            <Input
              id="specialPercentage"
              type="number"
              placeholder="e.g., 40"
              {...register('specialPercentage', { valueAsNumber: true })}
              error={errors.specialPercentage?.message}
            />
          </div>
        </div>

        <div className={`p-3 rounded-lg ${totalPercentage === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          <span className="font-medium">Total: {totalPercentage}%</span>
          {totalPercentage !== 100 && (
            <span className="ml-2">(Must equal 100%)</span>
          )}
        </div>
      </div>

      {/* Leave Policy */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Policy</h3>

        <div>
          <Label htmlFor="allowedPaidLeaves">Allowed Paid Leaves per Month</Label>
          <Input
            id="allowedPaidLeaves"
            type="number"
            placeholder="e.g., 2"
            {...register('allowedPaidLeaves', { valueAsNumber: true })}
            error={errors.allowedPaidLeaves?.message}
          />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <input
            type="checkbox"
            id="includePaidLeavesInPaidDays"
            {...register('includePaidLeavesInPaidDays')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="includePaidLeavesInPaidDays" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Include Allowed Paid Leaves in Paid Days count
          </Label>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 ml-1">
          When enabled, free leaves are added to paid days only if the employee has actually taken leave (approved, unapproved, or absent).
        </p>
      </div>

      {/* Footer Note */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Footer Note</h3>

        <div>
          <Label htmlFor="footerNote">Footer Note (appears on salary slip)</Label>
          <Textarea
            id="footerNote"
            placeholder="Enter footer note"
            rows={2}
            {...register('footerNote')}
            error={errors.footerNote?.message}
          />
        </div>
      </div>

      <Button type="submit" size="lg">
        Save Settings
      </Button>
    </form>
  );
}
