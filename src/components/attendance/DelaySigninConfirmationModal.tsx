'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, AlertTriangle } from 'lucide-react';

const delaySigninConfirmSchema = z.object({
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
});

type DelaySigninConfirmData = z.infer<typeof delaySigninConfirmSchema>;

interface LateInfo {
  shiftStartTime: string;
  shiftName: string;
  clockInTime: Date;
  minutesLate: number;
  monthlyDelayCount: number;
  maxMonthlyDelay: number;
  attendanceRecordId: string;
  shiftId: string;
}

interface DelaySigninConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { reason: string }) => Promise<void>;
  loading: boolean;
  lateInfo: LateInfo;
}

export function DelaySigninConfirmationModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
  lateInfo,
}: DelaySigninConfirmationModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DelaySigninConfirmData>({
    resolver: zodResolver(delaySigninConfirmSchema),
  });

  const limitReached = lateInfo.monthlyDelayCount >= lateInfo.maxMonthlyDelay;

  const onSubmitForm = async (data: DelaySigninConfirmData) => {
    try {
      await onSubmit({ reason: data.reason });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Delay sign-in form submission error:', error);
    }
  };

  const clockInStr = lateInfo.clockInTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Late Sign-In Detected
          </DialogTitle>
          <DialogDescription>
            You signed in after your shift start time. Would you like to submit a delay sign-in approval request?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Late Info Card */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Shift</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lateInfo.shiftName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Shift Start</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lateInfo.shiftStartTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Clock-In</span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{clockInStr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Minutes Late</span>
                <span className="flex items-center gap-1 text-sm font-bold text-orange-600 dark:text-orange-400">
                  <Clock className="h-3.5 w-3.5" />
                  {lateInfo.minutesLate} min
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Limit */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Monthly delay sign-in requests
            </span>
            <span className={`text-sm font-semibold ${limitReached ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
              {lateInfo.monthlyDelayCount} of {lateInfo.maxMonthlyDelay} used
            </span>
          </div>

          {limitReached && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              You have reached the maximum number of delay sign-in requests for this month.
            </div>
          )}

          {/* Reason Form */}
          {!limitReached && (
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div>
                <Label htmlFor="delay-signin-reason">Reason for Late Sign-In</Label>
                <Textarea
                  id="delay-signin-reason"
                  {...register('reason')}
                  rows={3}
                  placeholder="Please provide a reason for your late sign-in (min 10 characters)"
                />
                {errors.reason && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || loading}
                >
                  Dismiss
                </Button>
                <Button type="submit" disabled={isSubmitting || loading} className="text-white">
                  {isSubmitting || loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          )}

          {limitReached && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
