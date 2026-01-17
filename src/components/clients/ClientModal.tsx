import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Client } from '@/services/client.service';
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
import { Avatar } from '@/components/ui/avatar';
import { PhotoIcon } from '@heroicons/react/24/outline';

// Form-specific schema with required status
const clientFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email({ message: 'Invalid email format' }),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, { message: 'Invalid phone format' }),
  company: z.string().min(1, 'Company is required').max(100, 'Company must be less than 100 characters'),
  avatar: z.instanceof(File).optional(),
  status: z.enum(['active', 'inactive']),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  client?: Client | null;
  isLoading?: boolean;
}

/**
 * ClientModal Component
 * Form modal for creating and editing clients with validation
 * Validates Requirements: 1.2, 1.4, 1.5
 */
export function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  client,
  isLoading = false,
}: ClientModalProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
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

  // Update form when client prop changes (edit mode)
  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        status: client.status,
      });
      setAvatarPreview(client.avatarUrl || null);
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        company: '',
        status: 'active',
      });
      setAvatarPreview(null);
    }
  }, [client, reset]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('avatar', file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: ClientFormData) => {
    try {
      await onSubmit(data);
      reset();
      setAvatarPreview(null);
      onClose();
    } catch (error) {
      console.error('Error submitting client:', error);
    }
  };

  const handleClose = () => {
    reset();
    setAvatarPreview(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'Create New Client'}
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

          {/* Client Name */}
          <div>
            <Input
              id="name"
              label="Full Name"
              {...register('name')}
              placeholder="Enter client name"
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
              placeholder="client@example.com"
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

          {/* Company */}
          <div>
            <Input
              id="company"
              label="Company"
              {...register('company')}
              placeholder="Enter company name"
              error={errors.company?.message}
              required
              disabled={isLoading}
            />
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
              <option value="inactive">Inactive</option>
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
            <Button type="submit" loading={isLoading} disabled={isLoading}>
              {client ? 'Update Client' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
