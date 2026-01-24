import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee } from '@/services/employee.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon } from '@heroicons/react/24/outline';

// Form-specific schema with required fields
const employeeFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(20, 'Employee ID must be less than 20 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email({ message: 'Invalid email format' }),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, { message: 'Invalid phone format' }),
  role: z.enum(['Manager', 'Admin', 'Employee'], { message: 'Please select a role' }),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  status: z.enum(['active', 'on-leave']),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  employee?: Employee | null;
  isLoading?: boolean;
  managers?: Employee[]; // List of potential managers
}

/**
 * EmployeeModal Component
 * Form modal for creating and editing employees with validation
 * Validates Requirements: 5.2, 5.4
 */
export function EmployeeModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  isLoading = false,
  managers = [],
}: EmployeeModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      role: 'Employee',
      password: '',
      confirmPassword: '',
      status: 'active',
    },
  });

  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentName = watch('name');

  // Update form when employee prop changes (edit mode)
  useEffect(() => {
    if (employee) {
      reset({
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role || 'Employee',
        status: employee.status,
        password: '',
        confirmPassword: '',
      });
    } else {
      reset({
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        role: 'Employee',
        status: 'active',
        password: '',
        confirmPassword: '',
      });
    }
  }, [employee, reset]);

  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      // Validate password for new employees
      if (!employee) {
        if (!data.password || data.password.length < 6) {
          alert('Password is required and must be at least 6 characters for new employees');
          return;
        }
        if (data.password !== data.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
      } else {
        // For existing employees, validate password only if provided
        if (data.password) {
          if (data.password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
          }
          if (data.password !== data.confirmPassword) {
            alert('Passwords do not match');
            return;
          }
        }
      }
      
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting employee:', error);
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
          <DialogTitle>
            {employee ? 'Edit Employee' : 'Create New Employee'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Avatar Display with Initials */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-semibold">
              {getInitials(currentName) || <PhotoIcon className="w-12 h-12" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID */}
            <div>
              <Input
                id="employeeId"
                label="Employee ID"
                {...register('employeeId')}
                placeholder="EMP001"
                error={errors.employeeId?.message}
                required
                disabled={isLoading || !!employee} // Disable editing employee ID
              />
            </div>

            {/* Full Name */}
            <div>
              <Input
                id="name"
                label="Full Name"
                {...register('name')}
                placeholder="Enter employee name"
                error={errors.name?.message}
                required
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <Input
                id="email"
                type="email"
                label="Email"
                {...register('email')}
                placeholder="employee@example.com"
                error={errors.email?.message}
                required
                disabled={isLoading}
              />
            </div>

            {/* Phone */}
            <div>
              <Input
                id="phone"
                type="tel"
                label="Phone"
                {...register('phone')}
                placeholder="+1 (555) 123-4567"
                error={errors.phone?.message}
                required
                disabled={isLoading}
              />
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                {...register('role')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="Employee">Employee</option>
              </select>
              {errors.role && (
                <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
              )}
            </div>
          </div>

          {/* Password fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Input
                id="password"
                type="password"
                label={employee ? "New Password (optional)" : "Password"}
                {...register('password')}
                placeholder={employee ? "Leave blank to keep current" : "Enter password"}
                error={errors.password?.message}
                required={!employee}
                disabled={isLoading}
              />
              {employee && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to keep current password
                </p>
              )}
            </div>
            <div>
              <Input
                id="confirmPassword"
                type="password"
                label={employee ? "Confirm New Password" : "Confirm Password"}
                {...register('confirmPassword')}
                placeholder="Confirm password"
                error={errors.confirmPassword?.message}
                required={!employee}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="active">Active</option>
              <option value="on-leave">On Leave</option>
            </select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={isLoading} className="text-white">
              {employee ? 'Update Employee' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}