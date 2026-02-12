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
  businessName: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
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
      businessName: '',
      pan: '',
      tan: '',
      gstin: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
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

  // Update form when client prop changes (edit mode)
  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        businessName: client.businessName,
        pan: client.pan || '',
        tan: client.tan || '',
        gstin: client.gstin || '',
        email: client.email,
        phone: client.phone,
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || '',
        zipCode: client.zipCode || '',
        status: client.status,
      });
      setAvatarPreview(null);
    } else {
      reset({
        name: '',
        businessName: '',
        pan: '',
        tan: '',
        gstin: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        status: 'active',
      });
      setAvatarPreview(null);
    }
  }, [client, reset]);

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'Create New Client'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Avatar Upload - Removed for now */}
          
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

          {/* Business Name */}
          <div>
            <Input
              id="businessName"
              label="Business Name"
              {...register('businessName')}
              placeholder="Enter business name"
              error={errors.businessName?.message}
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
              disabled={isLoading}
            />
          </div>

          {/* Tax Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                id="pan"
                label="P.A.N."
                {...register('pan')}
                placeholder="ABCDE1234F"
                error={errors.pan?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="tan"
                label="T.A.N."
                {...register('tan')}
                placeholder="ABCD12345E"
                error={errors.tan?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="gstin"
                label="GSTIN"
                {...register('gstin')}
                placeholder="22AAAAA0000A1Z5"
                error={errors.gstin?.message}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Input
              id="address"
              label="Address"
              {...register('address')}
              placeholder="Enter street address"
              error={errors.address?.message}
              disabled={isLoading}
            />
          </div>

          {/* City, State, Country, Zip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                id="city"
                label="City"
                {...register('city')}
                placeholder="Enter city"
                error={errors.city?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="state"
                label="State"
                {...register('state')}
                placeholder="Enter state"
                error={errors.state?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="country"
                label="Country"
                {...register('country')}
                placeholder="Enter country"
                error={errors.country?.message}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                id="zipCode"
                label="Zip Code"
                {...register('zipCode')}
                placeholder="Enter zip code"
                error={errors.zipCode?.message}
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
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <Button type="submit" loading={isLoading} disabled={isLoading} className="text-white">
              {client ? 'Update Client' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
