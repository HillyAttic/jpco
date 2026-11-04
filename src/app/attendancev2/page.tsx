'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GeolocationAttendanceTracker, LeaveRequestModal, WfhRequestModal } from '@/components/attendance';
import { GlassSurface } from '@/components/ui/glass-surface';
import { cn } from '@/lib/utils';
import { useEnhancedAuth } from '@/contexts/enhanced-auth.context';
import { leaveService } from '@/services/leave.service';
import {
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  LeaveRequestFormData,
  WfhRequestFormData,
} from '@/types/attendance.types';
import { History, Calendar as CalendarIcon, CheckCircle, XCircle, Clock as ClockIconBox, MapPin } from 'lucide-react';
import { PlayIcon, HomeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const fmtDate = (d: Date | string) =>
  d instanceof Date ? d.toLocaleDateString() : new Date(d).toLocaleDateString();

const statusTone: Record<string, string> = {
  approved: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  rejected: 'border-red-500/25 bg-red-500/15 text-red-700 dark:text-red-300',
  pending: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  cancelled: 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
        statusTone[status] ?? 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300',
      )}
    >
      {status}
    </span>
  );
}

export default function AttendanceV2Page() {
  const { user, userProfile, loading: authLoading, isManager, isAdmin } = useEnhancedAuth();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);

  const [showWfhModal, setShowWfhModal] = useState(false);
  const [myWfhRequests, setMyWfhRequests] = useState<LeaveRequest[]>([]);
  const [pendingWfhRequests, setPendingWfhRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    if (searchParams?.get('openLeaveModal') === 'true') {
      setShowLeaveModal(true);
      window.history.replaceState({}, '', '/attendancev2');
    }
    if (searchParams?.get('openWfhModal') === 'true') {
      setShowWfhModal(true);
      window.history.replaceState({}, '', '/attendancev2');
    }
  }, [searchParams]);

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

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <GlassSurface className="mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Attendance Access Required</h2>
        <p className="mb-6 text-slate-600 dark:text-slate-300">Please sign in to access the attendance tracking system.</p>
        <button className="glass-button glass-button--primary" onClick={() => (window.location.href = '/auth/sign-in')}>
          Sign In to Continue
        </button>
      </GlassSurface>
    );
  }

  return (
    <div className="attendance-v2 relative isolate overflow-hidden rounded-[28px]">
      {/* Depth behind the glass: ambient color fields worth sampling */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#eef2ff_0%,#f8fafc_38%,#e6f7f1_100%)] dark:bg-[linear-gradient(160deg,#020d1a_0%,#041627_45%,#021019_100%)]" />
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-blue-400/35 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/15" />
      </div>

      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-3xl">
                Attendance Tracking
              </h1>
              <span className="glass-pill text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <PlayIcon className="h-3 w-3" />
                Connected
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              Track time, manage leaves, and view history
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="glass-button glass-button--primary" onClick={() => setShowLeaveModal(true)}>
              <CalendarIcon className="h-4 w-4" />
              Apply Leave
            </button>
            <button className="glass-button" onClick={() => setShowWfhModal(true)}>
              <HomeIcon className="h-4 w-4" />
              Apply WFH
            </button>
            <button
              className="glass-button w-11 px-0"
              aria-label="View attendance history"
              onClick={() => (window.location.href = '/attendance/history')}
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tracker */}
        <div className="flex justify-center py-1">
          <GeolocationAttendanceTracker containerClassName="glass-surface" />
        </div>

        {/* Pending approvals */}
        {(isManager || isAdmin) && pendingLeaves.length > 0 && (
          <GlassSurface className="overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/50 px-5 py-4 dark:border-white/10">
              <ClockIconBox className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Pending Approvals <span className="text-slate-500 dark:text-slate-400">({pendingLeaves.length})</span>
              </h2>
            </div>
            <ul className="divide-y divide-white/50 dark:divide-white/10">
              {pendingLeaves.map((request) => (
                <li key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{request.employeeName}</p>
                      <span className="glass-pill">{request.leaveTypeName}</span>
                      {request.halfDay && <span className="glass-pill">Half Day</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{request.duration} days</span> · {fmtDate(request.startDate)} to {fmtDate(request.endDate)}
                    </p>
                    <p className="mt-2 text-sm italic text-slate-700 dark:text-slate-300">&ldquo;{request.reason}&rdquo;</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="glass-button glass-button--success"
                      onClick={() => handleApproveLeave(request.id)}
                      disabled={processingId === request.id}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button className="glass-button" onClick={() => { setSelectedLeaveRequest(request); setShowApproveModal(true); }}>
                      Note
                    </button>
                    <button
                      className="glass-button glass-button--danger"
                      onClick={() => handleRejectLeave(request.id)}
                      disabled={processingId === request.id}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </GlassSurface>
        )}

        {(isManager || isAdmin) && pendingWfhRequests.length > 0 && (
          <GlassSurface className="overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/50 px-5 py-4 dark:border-white/10">
              <HomeIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Pending WFH Approvals <span className="text-slate-500 dark:text-slate-400">({pendingWfhRequests.length})</span>
              </h2>
            </div>
            <ul className="divide-y divide-white/50 dark:divide-white/10">
              {pendingWfhRequests.map((request) => (
                <li key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{request.employeeName}</p>
                      <span className="glass-pill">WFH</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{request.duration} days</span> · {fmtDate(request.startDate)} to {fmtDate(request.endDate)}
                    </p>
                    <p className="mt-2 text-sm italic text-slate-700 dark:text-slate-300">&ldquo;{request.reason}&rdquo;</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="glass-button glass-button--success"
                      onClick={() => handleApproveLeave(request.id)}
                      disabled={processingId === request.id}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button className="glass-button" onClick={() => { setSelectedLeaveRequest(request); setShowApproveModal(true); }}>
                      Note
                    </button>
                    <button
                      className="glass-button glass-button--danger"
                      onClick={() => handleRejectLeave(request.id)}
                      disabled={processingId === request.id}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </GlassSurface>
        )}

        {/* My leave history */}
        <GlassSurface className="overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-white/50 px-5 py-4 dark:border-white/10">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Leave History</h2>
            <button className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-300" onClick={() => setShowLeaveModal(true)}>
              Apply
            </button>
          </div>
          {myLeaves.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
              <CalendarIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No leave requests found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/50 dark:divide-white/10">
              {myLeaves.map((request) => (
                <li key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{request.leaveTypeName}</span>
                      <StatusPill status={request.status} />
                      {request.halfDay && <span className="glass-pill">Half Day</span>}
                    </div>
                    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CalendarIcon className="h-3 w-3" />
                      {fmtDate(request.startDate)} – {fmtDate(request.endDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Duration: {request.duration} days</p>

                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3">
                        <p className="mb-1 text-xs font-semibold text-red-700 dark:text-red-300">Admin Remarks</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{request.rejectionReason}</p>
                      </div>
                    )}
                    {request.status === 'approved' && request.approvalReason && (
                      <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                        <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Admin Note</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">{request.approvalReason}</p>
                      </div>
                    )}
                  </div>
                  {request.status === 'pending' && (
                    <button
                      className="self-start text-sm font-medium text-red-600 hover:underline dark:text-red-300"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this request?')) {
                          leaveService.cancelLeaveRequest(request.id).then(() => {
                            toast.success('Leave request cancelled');
                            fetchData();
                          });
                        }
                      }}
                    >
                      Cancel Request
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlassSurface>

        {/* My WFH history */}
        <GlassSurface className="overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-white/50 px-5 py-4 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <HomeIcon className="h-5 w-5" />
              My WFH History
            </h2>
            <button className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-300" onClick={() => setShowWfhModal(true)}>
              Request
            </button>
          </div>
          {myWfhRequests.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
              <HomeIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>No WFH requests found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/50 dark:divide-white/10">
              {myWfhRequests.map((request) => (
                <li key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">WFH</span>
                      <StatusPill status={request.status} />
                    </div>
                    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CalendarIcon className="h-3 w-3" />
                      {fmtDate(request.startDate)} – {fmtDate(request.endDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Duration: {request.duration} days</p>
                  </div>
                  {request.status === 'pending' && (
                    <button
                      className="self-start text-sm font-medium text-red-600 hover:underline dark:text-red-300"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this WFH request?')) {
                          leaveService.cancelLeaveRequest(request.id).then(() => {
                            toast.success('WFH request cancelled');
                            fetchData();
                          });
                        }
                      }}
                    >
                      Cancel Request
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlassSurface>

        {/* About */}
        <GlassSurface strength="soft" className="mx-auto max-w-2xl overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/50 px-5 py-4 dark:border-white/10">
            <MapPin className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">About Geolocation Attendance</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              This geolocation-based attendance system tracks your location when clocking in and out. Your location data
              is securely stored and used for attendance verification purposes.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { color: 'bg-emerald-500', title: 'Location Required', body: 'Browser location permission is needed for clock-in/out' },
                { color: 'bg-blue-500', title: 'Privacy Protected', body: 'Location data is only stored for attendance records' },
                { color: 'bg-amber-500', title: 'Real-time Tracking', body: 'Instant status updates and location verification' },
                { color: 'bg-violet-500', title: 'Mobile Friendly', body: 'Works on smartphones and tablets for remote workers' },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-2">
                  <span className={cn('mt-1.5 h-2 w-2 flex-none rounded-full', item.color)} />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </GlassSurface>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <GlassSurface strength="strong" className="w-full max-w-md rounded-2xl p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Approve Leave Request</h3>
            <div className="mb-4 rounded-xl border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{selectedLeaveRequest.employeeName}</span> – {selectedLeaveRequest.leaveTypeName}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {fmtDate(selectedLeaveRequest.startDate)} to {fmtDate(selectedLeaveRequest.endDate)}
              </p>
            </div>
            <label className="mb-2 block text-sm text-slate-600 dark:text-slate-300" htmlFor="approval-note">
              Add an optional note for the employee
            </label>
            <textarea
              id="approval-note"
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-white/15 dark:bg-white/10 dark:text-white"
              rows={3}
              placeholder="e.g., Approved. Enjoy your time off!"
            />
            <div className="mt-4 flex gap-2">
              <button
                className="glass-button glass-button--primary flex-1"
                onClick={() => handleApproveLeave(selectedLeaveRequest.id, approvalReason || undefined)}
                disabled={processingId === selectedLeaveRequest.id}
              >
                {processingId === selectedLeaveRequest.id ? 'Approving…' : 'Approve'}
              </button>
              <button
                className="glass-button flex-1"
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalReason('');
                  setSelectedLeaveRequest(null);
                }}
              >
                Cancel
              </button>
            </div>
          </GlassSurface>
        </div>
      )}
    </div>
  );
}
