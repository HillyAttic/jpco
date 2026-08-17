/**
 * Relieving Letter Settings Form Component
 * Form for managing company and signatory defaults
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { relievingLetterService } from '@/services/relieving-letter.service';
import { RelievingLetterSettings } from '@/types/relieving-letter.types';

const settingsSchema = z.object({
  defaultSignatoryName: z.string().min(1, 'Default signatory name is required'),
  defaultSignatoryDesignation: z.string().min(1, 'Default signatory designation is required'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface RelievingLetterSettingsFormProps {
  onSave?: () => void;
}

export function RelievingLetterSettingsForm({ onSave }: RelievingLetterSettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      defaultSignatoryName: '',
      defaultSignatoryDesignation: '',
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setFetching(true);
    try {
      const data = await relievingLetterService.getSettings();
      if (data) {
        reset({
          defaultSignatoryName: data.defaultSignatoryName || '',
          defaultSignatoryDesignation: data.defaultSignatoryDesignation || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    try {
      // Preserve existing companyName and companyAddress from fetched settings
      const currentSettings = await relievingLetterService.getSettings();
      const merged = {
        companyName: currentSettings?.companyName || 'JAIN P & CO.',
        companyAddress: currentSettings?.companyAddress || '',
        ...data,
      };
      const success = await relievingLetterService.saveSettings(merged as Omit<RelievingLetterSettings, 'id' | 'updatedAt'>);
      if (success) {
        toast.success('Settings saved successfully');
        onSave?.();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-8 text-center text-gray-500">Loading settings...</div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="defaultSignatoryName">Default Signatory Name</Label>
          <Input
            id="defaultSignatoryName"
            {...register('defaultSignatoryName')}
            placeholder="Enter default signatory name"
            disabled={loading}
            className="mt-1"
          />
          {errors.defaultSignatoryName && (
            <p className="text-red-500 text-xs mt-1">{errors.defaultSignatoryName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="defaultSignatoryDesignation">Default Signatory Designation</Label>
          <Input
            id="defaultSignatoryDesignation"
            {...register('defaultSignatoryDesignation')}
            placeholder="e.g. HR Manager"
            disabled={loading}
            className="mt-1"
          />
          {errors.defaultSignatoryDesignation && (
            <p className="text-red-500 text-xs mt-1">{errors.defaultSignatoryDesignation.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
