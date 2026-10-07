'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Input } from '@/components/Form/Input';
import { Button } from '@/components/Form/Button';
import { useNotification } from '@/contexts/notification.context';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { authenticatedFetch } from '@/lib/api-client';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// No email field: the account is always the signed-in one.
interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const EMPTY_FORM: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

/**
 * Eye toggle for a password field. Defined at module scope, not inside the page:
 * a component declared during render is a new type each time, so React would
 * remount the button and drop keyboard focus on every click.
 */
const RevealButton = ({ shown, label, onToggle }: { shown: boolean; label: string; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? `Hide ${label}` : `Show ${label}`}
    aria-pressed={shown}
    className="rounded p-1 text-dark-4 transition hover:text-dark dark:text-dark-6 dark:hover:text-white"
  >
    {shown ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
  </button>
);

const ChangePasswordPage = () => {
  const [formData, setFormData] = useState<ChangePasswordFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ChangePasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [revealed, setRevealed] = useState<Partial<Record<keyof ChangePasswordFormData, boolean>>>({});
  const { addNotification } = useNotification();
  const { user, signOut } = useEnhancedAuth();
  const router = useRouter();

  const toggleReveal = (field: keyof ChangePasswordFormData) =>
    setRevealed(prev => ({ ...prev, [field]: !prev[field] }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof ChangePasswordFormData]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof ChangePasswordFormData];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof ChangePasswordFormData, string>> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fail fast: authenticatedFetch would otherwise block for 5s and then throw.
    if (!user) {
      addNotification({
        type: 'error',
        message: 'You must be signed in to change your password',
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Distinguishes a token/permission rejection from a credential rejection.
        console.error('[change-password] failed', response.status, result);
        addNotification({
          type: 'error',
          message: result.message || result.error || 'Failed to change password',
        });
        return;
      }

      addNotification({
        type: 'success',
        message: result.message || 'Password updated successfully',
      });
      setFormData(EMPTY_FORM);

      // Sign out first: /auth/sign-in is an authRoute, so AuthWrapper bounces any
      // still-signed-in user straight back to /dashboard. Swallowed on purpose —
      // the password already changed, so a failed sign-out must not surface as one.
      try {
        await signOut();
      } catch (error) {
        console.error('[change-password] sign-out after password change failed', error);
      }
      router.replace('/auth/sign-in');
      return;
    } catch (error) {
      addNotification({
        type: 'error',
        message:
          error instanceof Error && error.message.includes('not authenticated')
            ? 'You must be signed in to change your password'
            : 'An error occurred while changing the password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-stroke bg-white shadow-card dark:border-stroke-dark dark:bg-dark-2">
      <div className="flex flex-wrap">
        <div className="hidden xl:block xl:w-1/2">
          <div className="flex h-full flex-col items-center justify-center bg-gray-1 px-26 py-17.5 text-center dark:bg-dark">
            <div className="mb-8">
              <Logo />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-dark dark:text-white sm:text-heading-6">
              JPCO Admin Dashboard
            </h2>
            <p className="text-dark-4 dark:text-dark-6">
              Securely manage your account
            </p>
          </div>
        </div>

        <div className="w-full xl:w-1/2 xl:border-l xl:border-stroke dark:xl:border-stroke-dark">
          <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
            <div className="mb-8 text-center">
              <div className="mb-6 flex justify-center">
                <Logo />
              </div>
              <h2 className="text-2xl font-bold text-dark dark:text-white sm:text-heading-6">
                Change Password
              </h2>
              <p className="mt-2 text-dark-4 dark:text-dark-6">
                Confirm your current password and choose a new one
              </p>
            </div>

            {!user ? (
              <div className="mb-6 rounded-lg border border-yellow-dark bg-yellow-light-4 p-4 text-sm text-dark">
                Please{' '}
                <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">
                  sign in
                </Link>{' '}
                before changing your password.
              </div>
            ) : (
              <p className="mb-6 text-sm text-dark-4 dark:text-dark-6">
                Changing the password for{' '}
                <span className="font-medium text-dark dark:text-white">{user.email}</span>
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <Input
                label="Current Password"
                type={revealed.currentPassword ? 'text' : 'password'}
                name="currentPassword"
                placeholder="Enter current password"
                error={errors.currentPassword}
                required
                value={formData.currentPassword}
                onChange={handleChange}
                suffix={
                  <RevealButton
                    shown={!!revealed.currentPassword}
                    label="current password"
                    onToggle={() => toggleReveal('currentPassword')}
                  />
                }
              />
              <p className="-mt-2 mb-4 text-sm text-dark-4 dark:text-dark-6">
                The password that user signs in with today — not the new one
              </p>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Input
                  label="New Password"
                  type={revealed.newPassword ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="Enter new password"
                  error={errors.newPassword}
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  suffix={
                    <RevealButton
                      shown={!!revealed.newPassword}
                      label="new password"
                      onToggle={() => toggleReveal('newPassword')}
                    />
                  }
                />
                <Input
                  label="Confirm New Password"
                  type={revealed.confirmNewPassword ? 'text' : 'password'}
                  name="confirmNewPassword"
                  placeholder="Confirm password"
                  error={errors.confirmNewPassword}
                  required
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  suffix={
                    <RevealButton
                      shown={!!revealed.confirmNewPassword}
                      label="confirm new password"
                      onToggle={() => toggleReveal('confirmNewPassword')}
                    />
                  }
                />
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/auth/sign-in')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isLoading} disabled={isLoading || !user}>
                  Save Changes
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="font-medium text-dark dark:text-white">
                  Remember your password?{' '}
                  <Link href="/auth/sign-in" className="text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
