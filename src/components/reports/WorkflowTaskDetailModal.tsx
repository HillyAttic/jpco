'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RecurringTask, WorkflowStep, WorkflowType, TeamMemberMapping, ClientWorkflowProgress, getClientCompletedStepIds, getClientProgressSummary, getClientStepMeta } from '@/services/recurring-task.service';
import { Client } from '@/services/client.service';
import { getWorkflowTemplate, getReportTypeById, getStepsForReportType } from '@/lib/workflow-templates';
import { TeamMemberMappingDialog } from '@/components/recurring-tasks/TeamMemberMappingDialog';
import { authenticatedFetch } from '@/lib/api-client';
import { toast } from 'react-toastify';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  XCircle,
  Search,
  Download,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  CalendarDays,
} from 'lucide-react';

/** A flattened row: one client from a task's team member mapping */
interface ClientRow {
  clientName: string;
  clientId: string;
  assignee: string;
}

// ── Financial Year helpers ────────────────────────────────────
function generateFinancialYears(): string[] {
  const years: string[] = [];
  for (let startYear = 2025; startYear <= 2035; startYear++) {
    years.push(`${startYear}-${String(startYear + 1).slice(-2)}`);
  }
  return years;
}

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const fyStart = month >= 3 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

/** Check if an ISO date string falls within a given FY (Apr 1 → Mar 31) */
function isDateInFY(isoDate: string | undefined, fy: string): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const fyStartYear = parseInt(fy.split('-')[0]);
  return month >= 3 ? year === fyStartYear : year === fyStartYear + 1;
}

interface WorkflowTaskDetailModalProps {
  task: RecurringTask;
  clients: Client[];
  workflowType: WorkflowType;
  onClose: () => void;
  showUnassignedClients?: boolean;
  unassignedClientIds?: string[];
}

export function WorkflowTaskDetailModal({
  task,
  clients,
  workflowType,
  onClose,
  showUnassignedClients = false,
  unassignedClientIds = [],
}: WorkflowTaskDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFY, setSelectedFY] = useState<string>(getCurrentFinancialYear());
  const financialYears = useMemo(() => generateFinancialYears(), []);

  // Build a task copy whose clientProgress is scoped to the selected FY.
  // Clients whose last update falls outside the FY are treated as having no completed steps
  // for that year, while still remaining visible in the list.
  const filteredTask = useMemo<RecurringTask>(() => {
    if (selectedFY === 'all' || !task.clientProgress) return task;

    const filtered: Record<string, ClientWorkflowProgress> = {};
    let hasAnyProgress = false;
    Object.entries(task.clientProgress).forEach(([clientId, progress]) => {
      if (isDateInFY(progress.completedAt, selectedFY)) {
        filtered[clientId] = progress;
        hasAnyProgress = true;
      } else {
        // Outside selected FY → reset step progress but keep entry so the client still appears
        filtered[clientId] = { completedStepIds: [] };
      }
    });

    if (!hasAnyProgress && Object.keys(task.clientProgress).length === 0) return task;
    return { ...task, clientProgress: filtered };
  }, [task, selectedFY]);

  // Team member mapping dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingTask, setMappingTask] = useState<RecurringTask | null>(null);
  const [localTasks, setLocalTasks] = useState<Record<string, RecurringTask>>({});

  // Tooltip state for unassigned badges (renders via portal to escape overflow)
  const [hoveredBadge, setHoveredBadge] = useState<{ x: number; y: number } | null>(null);

  const handleBadgeHover = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredBadge({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, []);

  const handleAssignClick = (task: RecurringTask) => {
    setMappingTask(task);
    setMappingDialogOpen(true);
  };

  const handleMappingSave = async (mappings: TeamMemberMapping[]) => {
    if (!mappingTask?.id) return;
    try {
      await authenticatedFetch(`/api/recurring-tasks/${mappingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberMappings: mappings }),
      });
      setLocalTasks(prev => ({
        ...prev,
        [mappingTask.id!]: { ...mappingTask, teamMemberMappings: mappings },
      }));
      toast.success('Team member mapping saved');
    } catch {
      toast.error('Failed to save mapping');
    }
  };

  // Get template from task's report types, falling back to static template
  const reportTypeConfig = getReportTypeById(task, workflowType);
  const template = reportTypeConfig || getWorkflowTemplate(workflowType);

  // Build a client ID → name lookup
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => {
      if (c.id) map.set(c.id, c.clientName || c.businessName || 'Unknown Client');
    });
    return map;
  }, [clients]);

  // Build rows for this single task
  const allRows = useMemo<ClientRow[]>(() => {
    const rows: ClientRow[] = [];
    const currentTask = localTasks[task.id!] || task;
    const hasMappings = currentTask.teamMemberMappings && currentTask.teamMemberMappings.length > 0;

    if (hasMappings) {
      currentTask.teamMemberMappings!.forEach((mapping) => {
        mapping.clientIds.forEach((clientId) => {
          rows.push({
            clientName: clientMap.get(clientId) || clientId,
            clientId,
            assignee: mapping.userName,
          });
        });
      });

      const mappedClientIds = new Set<string>();
      currentTask.teamMemberMappings!.forEach((m) =>
        m.clientIds.forEach((id) => mappedClientIds.add(id))
      );
      if (currentTask.contactIds) {
        currentTask.contactIds.forEach((clientId) => {
          if (!mappedClientIds.has(clientId)) {
            rows.push({
              clientName: clientMap.get(clientId) || clientId,
              clientId,
              assignee: 'Unassigned',
            });
          }
        });
      }
    } else if (currentTask.contactIds && currentTask.contactIds.length > 0) {
      currentTask.contactIds.forEach((clientId) => {
        rows.push({
          clientName: clientMap.get(clientId) || clientId,
          clientId,
          assignee: 'Unassigned',
        });
      });
    } else {
      rows.push({
        clientName: currentTask.title,
        clientId: '',
        assignee: 'Unassigned',
      });
    }

    // Include unassigned clients from dynamic filter if toggle is ON
    if (showUnassignedClients && unassignedClientIds.length > 0) {
      const existingClientIds = new Set(rows.map(r => r.clientId));
      unassignedClientIds.forEach((clientId) => {
        if (!existingClientIds.has(clientId)) {
          rows.push({
            clientName: clientMap.get(clientId) || clientId,
            clientId,
            assignee: 'Unassigned',
          });
        }
      });
    }

    return rows;
  }, [task, clientMap, localTasks, showUnassignedClients, unassignedClientIds]);

  // Get unique assignees
  const assignees = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((row) => set.add(row.assignee));
    return Array.from(set).sort();
  }, [allRows]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const matchesSearch =
        row.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.assignee.toLowerCase().includes(searchQuery.toLowerCase());

      const progress = getClientProgressSummary(row.clientId ? filteredTask : { ...filteredTask }, row.clientId, workflowType);
      const matchesStatus =
        statusFilter === 'all' || progress.status === statusFilter;

      const matchesAssignee =
        assigneeFilter === 'all' || row.assignee === assigneeFilter;

      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [allRows, searchQuery, statusFilter, assigneeFilter, workflowType, filteredTask]);

  // Calculate summary stats
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let totalPercentage = 0;
    let assigned = 0;
    let unassigned = 0;

    allRows.forEach((row) => {
      const progress = getClientProgressSummary(filteredTask, row.clientId, workflowType);
      totalPercentage += progress.percentage;
      if (row.assignee === 'Unassigned') {
        unassigned++;
      } else {
        assigned++;
      }
      switch (progress.status) {
        case 'completed':
          completed++;
          break;
        case 'in-progress':
          inProgress++;
          break;
        default:
          pending++;
      }
    });

    const avgCompletion = allRows.length > 0 ? Math.round(totalPercentage / allRows.length) : 0;

    return {
      totalClients: allRows.length,
      completed,
      inProgress,
      pending,
      avgCompletion,
      assigned,
      unassigned,
    };
  }, [allRows, filteredTask, workflowType]);

  // Export CSV for this single task
  const exportCSV = () => {
    const fyLabel = selectedFY === 'all' ? 'all-years' : `FY-${selectedFY}`;
    const headers = ['Client', 'Allocated', 'Status', ...template.steps.map((s) => s.shortName), 'Progress'];
    const rows = filteredRows.map((row) => {
      const completedStepIds = getClientCompletedStepIds(filteredTask, row.clientId, workflowType);
      const steps = getStepsForReportType(filteredTask, workflowType);
      const progress = getClientProgressSummary(filteredTask, row.clientId, workflowType);
      return [
        row.clientName,
        row.assignee,
        progress.status === 'completed' ? 'Completed' : progress.status === 'in-progress' ? 'In Progress' : 'Pending',
        ...(steps || []).map((s) => (completedStepIds.includes(s.id) ? 'Done' : 'Pending')),
        `${progress.percentage}%`,
      ];
    });

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title}-${workflowType}-${fyLabel}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const steps = getStepsForReportType(task, workflowType);

  // Format date for tooltip display
  const formatDate = (date: any) => {
    if (!date) return '';
    try {
      let d: Date;
      if (typeof date.toDate === 'function') {
        d = date.toDate();
      } else if (date.seconds !== undefined) {
        d = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        d = new Date(date);
      } else {
        d = date;
      }
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // User ID → name lookup for tooltips
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [fetchedUserNames, setFetchedUserNames] = useState(false);
  useEffect(() => {
    if (fetchedUserNames) return;
    authenticatedFetch('/api/users/names')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setUserNames(data);
          setFetchedUserNames(true);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, [fetchedUserNames]);

  const resolveUserName = (uid: string) => userNames[uid] || uid;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isFullscreen ? 'items-stretch justify-stretch p-0' : 'sm:items-center sm:justify-center sm:p-4'}`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal content */}
      <div className={`relative z-10 ${isFullscreen ? 'w-full h-full' : 'w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[95vw]'} flex flex-col bg-white dark:bg-gray-900 sm:rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700`}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-5 sm:px-6 py-4 bg-white dark:bg-gray-900">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {task.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Reporting overview
                <span className="mx-1.5 text-gray-300 dark:text-gray-600">|</span>
                <span className="text-gray-400 dark:text-gray-500">Read-only — updates live</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Stats cards ──────────────────────────────────── */}
          <div className="grid grid-cols-7 gap-2 mt-4">
            <StatCard label="Total" value={stats.totalClients} color="text-gray-900 dark:text-white" />
            <StatCard label="Assigned" value={stats.assigned} color="text-purple-600" />
            <StatCard label="Unassigned" value={stats.unassigned} color="text-orange-600" />
            <StatCard label="Done" value={stats.completed} color="text-green-600" />
            <StatCard label="In Progress" value={stats.inProgress} color="text-blue-600" />
            <StatCard label="Pending" value={stats.pending} color="text-amber-600" />
            <StatCard label="Avg. Progress" value={`${stats.avgCompletion}%`} color="text-gray-900 dark:text-white" highlight />
          </div>

          {/* ── Filters ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search client or assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="w-full sm:w-[140px] h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Years</option>
                {financialYears.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-[150px] h-9 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
            <Select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full sm:w-[160px] h-9 text-sm"
            >
              <option value="all">All assignees</option>
              {assignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── Scrollable table ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-gray-900">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-auto whitespace-nowrap">
              <colgroup>
                <col />
                <col className="w-[120px]" />
                <col className="w-[105px]" />
                {template.steps.map((_, i) => (
                  <col key={i} />
                ))}
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 whitespace-nowrap">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Assigned
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  {template.steps.map((step) => (
                    <th key={step.name} className="px-1 py-3 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap" title={step.name}>
                      {step.shortName}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.map((row, idx) => {
                  const completedStepIds = getClientCompletedStepIds(filteredTask, row.clientId, workflowType);
                  const progress = getClientProgressSummary(filteredTask, row.clientId, workflowType);

                  return (
                    <tr
                      key={`${row.clientId}-${idx}`}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900 z-10 break-words" title={row.clientName}>
                        {row.clientName}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 truncate">
                        {row.assignee === 'Unassigned' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 cursor-pointer hover:bg-orange-200 hover:shadow-md dark:hover:bg-orange-900/50 hover:scale-105 transition-all"
                            onClick={() => handleAssignClick(localTasks[task.id!] || task)}
                            onMouseEnter={handleBadgeHover}
                            onMouseLeave={() => setHoveredBadge(null)}
                          >
                            Unassigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {row.assignee}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={progress.status} />
                      </td>
                      {(steps || []).map((step) => {
                        const done = completedStepIds.includes(step.id);
                        const stepInfo = getClientStepMeta(filteredTask, row.clientId, step.id, workflowType);

                        // Build tooltip content
                        let tooltipParts: string[] = [];
                        if (done) {
                          tooltipParts.push('Completed');
                          if (stepInfo?.completedAt) {
                            tooltipParts.push(`Date: ${formatDate(stepInfo.completedAt)}`);
                          }
                          if (stepInfo?.completedBy) {
                            tooltipParts.push(`By: ${resolveUserName(stepInfo.completedBy)}`);
                          }
                          if (stepInfo?.remark) {
                            tooltipParts.push(`Remark: ${stepInfo.remark}`);
                          }
                        } else {
                          tooltipParts.push('Incomplete');
                        }
                        const tooltip = `${step.name} — ${tooltipParts.join(' · ')}`;

                        return (
                          <td key={step.id} className="px-1 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                                done
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-50 text-red-400 dark:bg-red-900/20 dark:text-red-400'
                              }`}
                              title={tooltip}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <Progress
                              value={progress.percentage}
                              className="h-2"
                              indicatorClassName={
                                progress.status === 'completed'
                                  ? 'bg-green-500'
                                  : progress.status === 'in-progress'
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap w-9 text-right">
                            {progress.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="lg:hidden space-y-2.5 p-3">
            {filteredRows.map((row, idx) => {
              const completedStepIds = getClientCompletedStepIds(filteredTask, row.clientId, workflowType);
              const progress = getClientProgressSummary(filteredTask, row.clientId, workflowType);

              return (
                <Card key={`${row.clientId}-${idx}`} className="border border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={row.clientName}>
                          {row.clientName}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                          Assigned:{' '}
                          {row.assignee === 'Unassigned' ? (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 cursor-pointer hover:bg-orange-200 hover:shadow-md dark:hover:bg-orange-900/50 hover:scale-105 transition-all"
                              onClick={() => handleAssignClick(localTasks[task.id!] || task)}
                              onMouseEnter={handleBadgeHover}
                              onMouseLeave={() => setHoveredBadge(null)}
                            >
                              Unassigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                              {row.assignee}
                            </span>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={progress.status} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(steps || []).map((step) => {
                        const done = completedStepIds.includes(step.id);
                        const stepInfo = getClientStepMeta(filteredTask, row.clientId, step.id, workflowType);
                        const tooltipParts: string[] = [step.name, done ? 'Completed' : 'Incomplete'];
                        if (done) {
                          if (stepInfo?.completedAt) tooltipParts.push(`Date: ${formatDate(stepInfo.completedAt)}`);
                          if (stepInfo?.completedBy) tooltipParts.push(`By: ${resolveUserName(stepInfo.completedBy)}`);
                          if (stepInfo?.remark) tooltipParts.push(`Remark: ${stepInfo.remark}`);
                        }
                        return (
                          <span
                            key={step.id}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                              done
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                            title={tooltipParts.join(' · ')}
                          >
                            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {step.shortName}
                            {stepInfo?.remark && (
                              <MessageSquare className="h-2.5 w-2.5 text-amber-500 ml-0.5" />
                            )}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress
                        value={progress.percentage}
                        className="h-2 flex-1"
                        indicatorClassName={
                          progress.status === 'completed'
                            ? 'bg-green-500'
                            : progress.status === 'in-progress'
                            ? 'bg-blue-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }
                      />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-9 text-right">{progress.percentage}%</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No clients match your filters.</p>
            </div>
          )}
        </div>

        {/* ── Legend footer ──────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800/80 px-5 sm:px-6 py-2.5 flex items-center gap-5 text-xs border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-gray-600 dark:text-gray-400">Incomplete</span>
          </div>
        </div>
      </div>

      {/* Team Member Mapping Dialog */}
      {mappingTask && (
        <TeamMemberMappingDialog
          isOpen={mappingDialogOpen}
          onClose={() => { setMappingDialogOpen(false); setMappingTask(null); }}
          onSave={handleMappingSave}
          initialMappings={mappingTask.teamMemberMappings || []}
          defaultClientFilter={mappingTask.clientFilter || 'all'}
        />
      )}

      {/* Portal-based tooltip (escapes overflow containers) */}
      {hoveredBadge && createPortal(
        <div
          className="fixed px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold whitespace-nowrap shadow-lg z-[9999] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: hoveredBadge.x, top: hoveredBadge.y }}
        >
          Click to assign →
        </div>,
        document.body
      )}
    </div>
  );
}

/* ──── Sub-components ───────────────────────────────────────── */

function StatCard({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: number | string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-1.5 transition-colors ${
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40'
      }`}
    >
      <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
        {label}
      </p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Completed
      </span>
    );
  }
  if (status === 'in-progress') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Pending
    </span>
  );
}
