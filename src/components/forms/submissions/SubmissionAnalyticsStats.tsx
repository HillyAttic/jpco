'use client';

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { SimpleStatCard } from '@/components/dashboard/SimpleStatCard';
import { AnalyticsDateFilter, DateFilterValue } from './AnalyticsDateFilter';
import { SubmissionUsersModal } from './SubmissionUsersModal';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

interface SubmissionAnalyticsStatsProps {
  formId: string;
  template: FormTemplate;
  onRefresh?: () => void;
}

interface AnalyticsData {
  formId: string;
  formTitle: string;
  dateFilter: string;
  dateRange: { start: string; end: string } | null;
  totalAssigned: number;
  submittedCount: number;
  notSubmittedCount: number;
  submittedUserIds: string[];
  notSubmittedUserIds: string[];
  submissionsWithTimestamps: Record<string, string>;
  zeroResponseField: {
    fieldId: string;
    fieldLabel: string;
    count: number;
    userIds: string[];
  } | null;
}

interface ModalState {
  isOpen: boolean;
  category: 'submitted' | 'not-submitted' | 'zero-response';
  userIds: string[];
  fieldLabel?: string;
  submissionsWithTimestamps?: Record<string, string>;
}

export function SubmissionAnalyticsStats({
  formId,
  template,
  onRefresh,
}: SubmissionAnalyticsStatsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('today');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [formId, dateFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(
        `/api/mis-tracker/analytics?formId=${formId}&dateFilter=${dateFilter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (
    category: 'submitted' | 'not-submitted' | 'zero-response',
    userIds: string[],
    fieldLabel?: string
  ) => {
    setModalState({
      isOpen: true,
      category,
      userIds,
      fieldLabel,
      submissionsWithTimestamps: category === 'submitted' ? analyticsData?.submissionsWithTimestamps : undefined,
    });
  };

  const closeModal = () => {
    setModalState(null);
  };

  if (loading && !analyticsData) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {/* Date Filter Skeleton */}
        <div className="flex gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 sm:h-10 w-16 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 sm:h-28 lg:h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-900 dark:text-red-100 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const { totalAssigned, submittedCount, notSubmittedCount, submittedUserIds, notSubmittedUserIds, zeroResponseField } = analyticsData;

  // Empty state
  if (totalAssigned === 0) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
        <p className="text-blue-900 dark:text-blue-100">
          No users assigned to this form. Configure assignments in MIS settings.
        </p>
      </div>
    );
  }

  // Success state - 100% completion
  const isFullyCompleted = notSubmittedCount === 0 && submittedCount > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Date Filter */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-2 sm:gap-3">
        <AnalyticsDateFilter value={dateFilter} onChange={setDateFilter} />

        {isFullyCompleted && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">All users have submitted!</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assigned */}
        <SimpleStatCard
          title="Total Assigned"
          value={totalAssigned}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="blue"
          subtitle="Users assigned to form"
        />

        {/* Submitted */}
        <SimpleStatCard
          title="Submitted"
          value={submittedCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
          subtitle="Click to view users"
          onClick={() => handleCardClick('submitted', submittedUserIds)}
        />

        {/* Not Submitted */}
        <SimpleStatCard
          title="Not Submitted"
          value={notSubmittedCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="orange"
          subtitle="Click to view users"
          onClick={() => handleCardClick('not-submitted', notSubmittedUserIds)}
        />

        {/* Zero Group Visits (conditional) */}
        {zeroResponseField && (
          <SimpleStatCard
            title="Zero Responses"
            mobileTitle="Zero"
            value={zeroResponseField.count}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="purple"
            subtitle={zeroResponseField.fieldLabel}
            onClick={() => handleCardClick('zero-response', zeroResponseField.userIds, zeroResponseField.fieldLabel)}
          />
        )}
      </div>

      {/* User List Modal */}
      {modalState && (
        <SubmissionUsersModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          userIds={modalState.userIds}
          category={modalState.category}
          formTitle={template.title}
          dateFilter={dateFilter}
          fieldLabel={modalState.fieldLabel}
          submissionsWithTimestamps={modalState.submissionsWithTimestamps}
        />
      )}
    </div>
  );
}
