'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GeolocationAttendanceTracker,
  LeaveRequestModal,
  WfhRequestModal,
} from '@/components/attendance';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { leaveService } from '@/services/leave.service';
import { cn } from '@/lib/utils';
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveRequestFormData,
  LeaveType,
  WfhRequestFormData,
} from '@/types/attendance.types';
import { toast } from 'react-toastify';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Home,
  Inbox,
  MapPin,
  Sparkles,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

type TabId = 'leave' | 'wfh' | 'approvals';

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'v3-pill capitalize',
        status === 'approved' && 'v3-pill--approved',
        status === 'rejected' && 'v3-pill--rejected',
        status === 'pending' && 'v3-pill--pending',
        status === 'cancelled' && 'v3-pill--cancelled',
      )}
    >
      {status}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/50 bg-white/40 dark:border-white/10 dark:bg-white/5">
        <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function RequestRow({
  request,
  onCancel,
}: {
  request: LeaveRequest;
  onCancel?: () => void;
}) {
  return (
    <li className="v3-row px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {request.leaveTypeId === 'wfh' ? 'Work from home' : request.leaveTypeName}
            </span>
            <StatusPill status={request.status} />
            {request.halfDay && <span className="v3-pill">Half day</span>}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <CalendarDays className="h-3.5 w-3.5" />
            {fmtDate(request.startDate)} – {fmtDate(request.endDate)}
            <span className="opacity-40">·</span>
            {request.duration} day{request.duration === 1 ? '' : 's'}
          </p>
          {request.rejectionReason && (
            <p className="mt-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold">Admin remarks:</span> {request.rejectionReason}
            </p>
          )}
          {request.approvalReason && (
            <p className="mt-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">Admin note:</span> {request.approvalReason}
            </p>
          )}
        </div>
        {request.status === 'pending' && onCancel && (
          <button
            type="button"
            className="v3-link v3-link--danger shrink-0"
            onClick={onCancel}
          >
            Cancel request
          </button>
        )}
      </div>
    </li>
  );
}

function ApprovalRow({
  request,
  busy,
  onApprove,
  onNote,
  onReject,
}: {
  request: LeaveRequest;
  busy: boolean;
  onApprove: () => void;
  onNote: () => void;
  onReject: () => void;
}) {
  return (
    <li className="v3-row px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{request.employeeName}</span>
            <span className="v3-pill">
              {request.leaveTypeId === 'wfh' ? 'WFH' : request.leaveTypeName}
            </span>
            {request.halfDay && <span className="v3-pill">Half day</span>}
          </div>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            {fmtDate(request.startDate)} – {fmtDate(request.endDate)} ·{' '}
            <span className="font-medium">{request.duration} day{request.duration === 1 ? '' : 's'}</span>
          </p>
          <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-300">
            &ldquo;{request.reason}&rdquo;
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="v3-btn v3-btn--success"
            onClick={onApprove}
            disabled={busy}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
          <button type="button" className="v3-btn" onClick={onNote} disabled={busy}>
            Note
          </button>
          <button
            type="button"
            className="v3-btn v3-btn--danger"
            onClick={onReject}
            disabled={busy}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      </div>
    </li>
  );
}

export default function AttendanceV3Page() {
  const { user, userProfile, loading: authLoading, isManager, isAdmin } = useEnhancedAuth();

  const [tab, setTab] = useState<TabId>('leave');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWfhModal, setShowWfhModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [myWfhRequests, setMyWfhRequests] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingWfhRequests, setPendingWfhRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openLeave = params.get('openLeaveModal') === 'true';
    const openWfh = params.get('openWfhModal') === 'true';
    if (openLeave) setShowLeaveModal(true);
    if (openWfh) setShowWfhModal(true);
    if (openLeave || openWfh) window.history.replaceState({}, '', '/attendancev3');
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingLeaves(true);
      setLeaveTypes(await leaveService.getLeaveTypes());
      setLeaveBalances(await leaveService.getLeaveBalances(user.uid));

      const requests = await leaveService.getLeaveRequests({ employeeId: user.uid });
      setMyLeaves(requests.filter((r) => r.leaveTypeId !== 'wfh'));
      setMyWfhRequests(requests.filter((r) => r.leaveTypeId === 'wfh'));

      if (isManager || isAdmin) {
        const pending = await leaveService.getPendingLeaveRequests(user.uid);
        setPendingLeaves(pending.filter((r) => r.leaveTypeId !== 'wfh'));
        setPendingWfhRequests(pending.filter((r) => r.leaveTypeId === 'wfh'));
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setLoadingLeaves(false);
    }
  }, [user, isManager, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyLeave = async (data: LeaveRequestFormData) => {
    if (!user || !userProfile) return;
    try {
      setLoadingLeaves(true);
      await leaveService.createLeaveRequest({
        ...data,
        employeeId: user.uid,
        employeeName: userProfile.displayName || user.email || 'Unknown',
      });
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error('Failed to submit leave request');
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleApplyWfh = async (data: WfhRequestFormData) => {
    if (!user || !userProfile) return;
    try {
      setLoadingLeaves(true);
      await leaveService.createLeaveRequest({
        leaveTypeId: 'wfh',
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        halfDay: false,
        employeeId: user.uid,
        employeeName: userProfile.displayName || user.email || 'Unknown',
      });
      toast.success('WFH request submitted successfully');
      setShowWfhModal(false);
      fetchData();
    } catch (error) {
      console.error('Error submitting WFH:', error);
      toast.error('Failed to submit WFH request');
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleApproveLeave = async (id: string, reason?: string) => {
    if (!user) return;
    try {
      setProcessingId(id);
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', ...(reason && { approvalReason: reason }) }),
      });
      if (!response.ok) throw new Error('Failed to approve leave');
      toast.success('Leave approved');
      fetchData();
      if (showApproveModal) {
        setShowApproveModal(false);
        setApprovalReason('');
        setSelectedLeaveRequest(null);
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLeave = async (id: string) => {
    if (!user) return;
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      setProcessingId(id);
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      if (!response.ok) throw new Error('Failed to reject leave');
      toast.success('Leave rejected');
      fetchData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave');
    } finally {
      setProcessingId(null);
    }
  };

  const cancelRequest = (request: LeaveRequest) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    leaveService
      .cancelLeaveRequest(request.id)
      .then(() => {
        toast.success('Request cancelled');
        fetchData();
      })
      .catch(() => toast.error('Failed to cancel request'));
  };

  const pendingApprovals = useMemo(
    () => [...pendingLeaves, ...pendingWfhRequests],
    [pendingLeaves, pendingWfhRequests],
  );

  const tabs: { id: TabId; label: string; icon: LucideIcon; count: number }[] = [
    { id: 'leave', label: 'Leaves', icon: CalendarDays, count: myLeaves.length },
    { id: 'wfh', label: 'WFH', icon: Home, count: myWfhRequests.length },
    ...((isManager || isAdmin)
      ? [{ id: 'approvals' as TabId, label: 'Approvals', icon: Inbox, count: pendingApprovals.length }]
      : []),
  ];

  const myPending = [...myLeaves, ...myWfhRequests].filter((r) => r.status === 'pending').length;
  const myApproved = [...myLeaves, ...myWfhRequests].filter((r) => r.status === 'approved').length;

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="attendance-v3">
        <div className="v3-backdrop" aria-hidden>
          <div className="v3-blob v3-blob--a" />
          <div className="v3-blob v3-blob--b" />
        </div>
        <div className="relative z-10 mx-auto max-w-md px-4 py-16">
          <div className="v3-glass p-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/60 bg-white/50 dark:border-white/15 dark:bg-white/10">
              <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.03em]">Attendance access required</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Please sign in to access the attendance tracking system.
            </p>
            <button
              type="button"
              className="v3-btn v3-btn--primary mt-6 w-full"
              onClick={() => (window.location.href = '/auth/sign-in')}
            >
              Sign in to continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-v3">
      {/* Busy backdrop for the frost to sample */}
      <div className="v3-backdrop" aria-hidden>
        <div className="v3-blob v3-blob--a" />
        <div className="v3-blob v3-blob--b" />
        <div className="v3-blob v3-blob--c" />
      </div>

      {/* Refraction lens for the hero */}
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden focusable="false">
        <filter id="v3-liquid" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="3"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="18s"
              values="0.008 0.012;0.012 0.008;0.008 0.012"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="16"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div className="relative z-10 mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="v3-glass flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/60 bg-white/55 shadow-inner dark:border-white/15 dark:bg-white/10">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">Attendance</h1>
                <span className="v3-pill">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Liquid glass
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                Time, leaves, and approvals in one frosted workspace
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="v3-btn v3-btn--primary"
              onClick={() => setShowLeaveModal(true)}
            >
              <CalendarDays className="h-4 w-4" />
              Apply leave
            </button>
            <button type="button" className="v3-btn" onClick={() => setShowWfhModal(true)}>
              <Home className="h-4 w-4" />
              WFH
            </button>
            <button
              type="button"
              className="v3-btn v3-btn--icon"
              aria-label="View attendance history"
              onClick={() => (window.location.href = '/attendance/history')}
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* Liquid hero */}
          <section className="v3-glass v3-liquid p-5 sm:p-6">
            <div className="v3-liquid__refract" aria-hidden />
            <div className="v3-sweep" aria-hidden />
            <div className="relative z-[1]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Today
                  </p>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">Shift tracker</h2>
                </div>
                <span className="v3-pill">
                  <MapPin className="h-3 w-3" />
                  Geolocation verified
                </span>
              </div>
              <div className="flex justify-center">
                <GeolocationAttendanceTracker containerClassName="v3-tracker" />
              </div>
            </div>
          </section>

          {/* Aside */}
          <div className="flex flex-col gap-5">
            <section className="v3-glass p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Leave balance
                </h2>
                <button
                  type="button"
                  className="v3-link"
                  onClick={() => setShowLeaveModal(true)}
                >
                  Apply
                </button>
              </div>
              {leaveBalances.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-400/30 px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No leave balances yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {leaveBalances.slice(0, 4).map((balance) => {
                    const pct = balance.totalDays
                      ? Math.max(0, Math.min(100, Math.round((balance.remainingDays / balance.totalDays) * 100)))
                      : 0;
                    return (
                      <div key={balance.leaveTypeId} className="v3-tile p-3.5">
                        <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {balance.leaveTypeName}
                        </p>
                        <p className="mt-1 text-2xl font-bold tracking-[-0.03em]">
                          {balance.remainingDays}
                          <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            / {balance.totalDays} days
                          </span>
                        </p>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/55 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="v3-glass p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                At a glance
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Clock3, label: 'My pending requests', value: myPending, tone: 'text-amber-600 dark:text-amber-300' },
                  { icon: CheckCircle2, label: 'Approved requests', value: myApproved, tone: 'text-emerald-600 dark:text-emerald-300' },
                  ...((isManager || isAdmin)
                    ? [{ icon: Inbox, label: 'Awaiting my approval', value: pendingApprovals.length, tone: 'text-blue-600 dark:text-blue-300' }]
                    : []),
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/50 bg-white/40 dark:border-white/10 dark:bg-white/5">
                      <stat.icon className={cn('h-4 w-4', stat.tone)} />
                    </span>
                    <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">
                      {stat.label}
                    </span>
                    <span className="text-lg font-bold tabular-nums">{stat.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Requests panel */}
        <section className="v3-glass overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">Requests</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loadingLeaves ? 'Refreshing…' : 'Leave, remote work, and approvals'}
              </p>
            </div>
            <div className="v3-tabs" role="tablist" aria-label="Request views">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className="v3-tab"
                  onClick={() => setTab(item.id)}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div role="tabpanel" className="v3-divide border-t border-[var(--v3-hairline)]">
            {tab === 'leave' &&
              (myLeaves.length ? (
                <ul>
                  {myLeaves.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      onCancel={() => cancelRequest(request)}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No leave requests"
                  hint="Apply for leave and it will show up here."
                />
              ))}

            {tab === 'wfh' &&
              (myWfhRequests.length ? (
                <ul>
                  {myWfhRequests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      onCancel={() => cancelRequest(request)}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Home}
                  title="No WFH requests"
                  hint="Request remote work and track its approval here."
                />
              ))}

            {tab === 'approvals' && (isManager || isAdmin) &&
              (pendingApprovals.length ? (
                <ul>
                  {pendingApprovals.map((request) => (
                    <ApprovalRow
                      key={request.id}
                      request={request}
                      busy={processingId === request.id}
                      onApprove={() => handleApproveLeave(request.id)}
                      onNote={() => {
                        setSelectedLeaveRequest(request);
                        setShowApproveModal(true);
                      }}
                      onReject={() => handleRejectLeave(request.id)}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CheckCircle2}
                  title="All caught up"
                  hint="No pending leave or WFH approvals."
                />
              ))}
          </div>
        </section>

        <footer className="v3-glass v3-glass--soft flex items-center gap-2 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          Location is captured only when you clock in or out, and is used solely for attendance verification.
        </footer>
      </div>

      <LeaveRequestModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        onSubmit={handleApplyLeave}
        leaveTypes={leaveTypes}
        leaveBalances={leaveBalances}
        loading={loadingLeaves}
      />

      <WfhRequestModal
        open={showWfhModal}
        onOpenChange={setShowWfhModal}
        onSubmit={handleApplyWfh}
        loading={loadingLeaves}
      />

      {showApproveModal && selectedLeaveRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="v3-glass v3-glass--strong w-full max-w-md rounded-2xl p-6">
            <h3 className="text-lg font-bold tracking-[-0.02em]">Approve request</h3>
            <div className="mt-3 rounded-xl border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm">
                <span className="font-semibold">{selectedLeaveRequest.employeeName}</span>
                {' – '}
                {selectedLeaveRequest.leaveTypeId === 'wfh'
                  ? 'WFH'
                  : selectedLeaveRequest.leaveTypeName}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {fmtDate(selectedLeaveRequest.startDate)} – {fmtDate(selectedLeaveRequest.endDate)}
              </p>
            </div>
            <label
              htmlFor="v3-approval-note"
              className="mt-4 block text-sm text-slate-600 dark:text-slate-300"
            >
              Optional note for the employee
            </label>
            <textarea
              id="v3-approval-note"
              value={approvalReason}
              onChange={(event) => setApprovalReason(event.target.value)}
              rows={3}
              placeholder="e.g., Approved. Enjoy your time off!"
              className="mt-2 w-full rounded-xl border border-white/60 bg-white/55 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/15 dark:bg-white/10"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="v3-btn v3-btn--primary flex-1"
                onClick={() =>
                  handleApproveLeave(
                    selectedLeaveRequest.id,
                    approvalReason || undefined,
                  )
                }
                disabled={processingId === selectedLeaveRequest.id}
              >
                {processingId === selectedLeaveRequest.id ? 'Approving…' : 'Approve'}
              </button>
              <button
                type="button"
                className="v3-btn flex-1"
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalReason('');
                  setSelectedLeaveRequest(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
