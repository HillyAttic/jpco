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
  position: z.string().min(1, 'Position is required').max(100, 'Position must be less than 100 characters'),
  department: z.string().min(1, 'Department is required').max(100, 'Department must be less than 100 characters'),
  hireDate: z.date({ message: 'Invalid date format' }).refine((date) => date <= new Date(), {
    message: 'Hire date cannot be in the future'
  }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  avatar: z.instanceof(File).optional(),
  managerId: z.string().optional(),
  status: z.enum(['active', 'on-leave', 'terminated']),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  }
);

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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      hireDate: new Date(),
      password: '',
      confirmPassword: '',
      managerId: '',
      status: 'active',
    },
  });

  // Watch avatar field for preview
  const avatarFile = watch('avatar');

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
        position: employee.position,
        department: employee.department,
        hireDate: new Date(employee.hireDate),
        managerId: employee.managerId || '',
        status: employee.status,
      });
      setAvatarPreview(employee.avatarUrl || null);
    } else {
      reset({
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        hireDate: new Date(),
        managerId: '',
        status: 'active',
      });
      setAvatarPreview(null);
    }
  }, [employee, reset]);

  // Handle avatar file selection with validation
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      setValue('avatar', file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      await onSubmit(data);
      reset();
      setAvatarPreview(null);
      onClose();
    } catch (error) {
      console.error('Error submitting employee:', error);
    }
  };

  const handleClose = () => {
    reset();
    setAvatarPreview(null);
    onClose();
  };

  // Format date for input
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
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
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-semibold">
                  {getInitials(currentName) || <PhotoIcon className="w-12 h-12" />}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <Label
                htmlFor="avatar-upload"
                className="cursor-pointer text-sm text-blue-600 hover:text-blue-700"
              >
                {avatarPreview ? 'Change Photo' : 'Upload Photo'}
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500">
                JPG, PNG or GIF (max 5MB)
              </p>
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

            {/* Position */}
            <div>
              <Input
                id="position"
                label="Position"
                {...register('position')}
                placeholder="Software Engineer"
                error={errors.position?.message}
                required
                disabled={isLoading}
              />
            </div>

            {/* Department */}
            <div>
              <Input
                id="department"
                label="Department"
                {...register('department')}
                placeholder="Engineering"
                error={errors.department?.message}
                required
                disabled={isLoading}
              />
            </div>

            {/* Hire Date */}
            <div>
              <Label htmlFor="hireDate">Hire Date</Label>
              <input
                id="hireDate"
                type="date"
                {...register('hireDate', { valueAsDate: true })}
                max={formatDateForInput(new Date())}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
              {errors.hireDate && (
                <p className="text-sm text-red-600 mt-1">{errors.hireDate.message}</p>
              )}
            </div>

            {/* Manager Selection */}
            <div>
              <Label htmlFor="managerId">Manager (Optional)</Label>
              <select
                id="managerId"
                {...register('managerId')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="">Select a manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} - {manager.position}
                  </option>
                ))}
              </select>
              {errors.managerId && (
                <p className="text-sm text-red-600 mt-1">{errors.managerId.message}</p>
              )}
            </div>
          </div>

          {/* Password fields - only for new employees */}
          {!employee && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Input
                    id="password"
                    type="password"
                    label="Password"
                    {...register('password')}
                    placeholder="Enter password"
                    error={errors.password?.message}
                    required={!employee}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    label="Confirm Password"
                    {...register('confirmPassword')}
                    placeholder="Confirm password"
                    error={errors.confirmPassword?.message}
                    required={!employee}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

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
              <option value="terminated">Terminated</option>
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