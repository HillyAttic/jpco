/**
 * SalaryConfigModal
 * Dialog for setting employee payroll details (DOJ, PAN, Designation, Gross Salary)
 */

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  designation?: string;
  doj?: string | null;
  pan?: string | null;
  grossSalary?: number;
}

interface SalaryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SalaryConfigData) => Promise<void>;
  employee: Employee | null;
  isLoading: boolean;
}

const schema = z.object({
  doj: z.string().optional().nullable(),
  pan: z.string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val) || val === '';
    }, 'Invalid PAN format (ABCDE1234F)'),
  designation: z.string().min(1, 'Designation is required'),
  grossSalary: z.number().min(0, 'Gross salary must be positive'),
});

type SalaryConfigData = z.infer<typeof schema>;

export function SalaryConfigModal({
  isOpen,
  onClose,
  onSave,
  employee,
  isLoading,
}: SalaryConfigModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SalaryConfigData>({
    resolver: zodResolver(schema),
    defaultValues: {
      doj: null,
      pan: null,
      designation: '',
      grossSalary: 0,
    },
  });

  useEffect(() => {
    if (isOpen && employee) {
      reset({
        doj: employee.doj || '',
        pan: employee.pan || '',
        designation: employee.designation || '',
        grossSalary: employee.grossSalary || 0,
      });
    } else if (isOpen) {
      reset({
        doj: '',
        pan: '',
        designation: '',
        grossSalary: 0,
      });
    }
  }, [isOpen, employee, reset]);

  const onSubmit = async (data: SalaryConfigData) => {
    try {
      await onSave(data);
      toast.success('Employee payroll details updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update payroll details');
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {employee ? `Configure Salary - ${employee.name}` : 'Configure Salary'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Date of Joining */}
          <div>
            <Label htmlFor="doj">Date of Joining</Label>
            <Input
              id="doj"
              type="date"
              {...register('doj')}
              error={errors.doj?.message}
              disabled={isLoading}
            />
          </div>

          {/* PAN */}
          <div>
            <Label htmlFor="pan">PAN Number</Label>
            <Input
              id="pan"
              placeholder="ABCDE1234F"
              {...register('pan')}
              error={errors.pan?.message}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)</p>
          </div>

          {/* Designation */}
          <div>
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              placeholder="e.g., Software Engineer"
              {...register('designation')}
              error={errors.designation?.message}
              disabled={isLoading}
            />
          </div>

          {/* Gross Salary */}
          <div>
            <Label htmlFor="grossSalary">Gross Salary ()</Label>
            <Input
              id="grossSalary"
              type="number"
              placeholder="e.g., 50000"
              {...register('grossSalary', { valueAsNumber: true })}
              error={errors.grossSalary?.message}
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
