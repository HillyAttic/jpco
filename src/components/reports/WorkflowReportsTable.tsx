'use client';

import React, { useState, useMemo } from 'react';
import { RecurringTask, WorkflowStep, WorkflowType, TeamMemberMapping, getClientCompletedStepIds, getClientProgressSummary } from '@/services/recurring-task.service';
import { Client } from '@/services/client.service';
import { calculateWorkflowProgress, getWorkflowTemplate } from '@/lib/workflow-templates';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Select from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Search, Download, Eye } from 'lucide-react';
import { TeamMemberMappingDialog } from '@/components/recurring-tasks/TeamMemberMappingDialog';
import { authenticatedFetch } from '@/lib/api-client';
import { toast } from 'react-toastify';

/** A flattened row: one client from a task's team member mapping */
interface ClientRow {
  taskId: string;
  task: RecurringTask;
  clientName: string;
  clientId: string;
  assignee: string;
}

interface WorkflowReportsTableProps {
  tasks: RecurringTask[];
  clients: Client[];
  workflowType: WorkflowType;
  onViewDetails?: (task: RecurringTask) => void;
}

export function WorkflowReportsTable({
  tasks,
  clients,
  workflowType,
  onViewDetails,
}: WorkflowReportsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Team member mapping dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingTask, setMappingTask] = useState<RecurringTask | null>(null);
  const [localTasks, setLocalTasks] = useState<Record<string, RecurringTask>>({});

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

  const template = getWorkflowTemplate(workflowType);

  // Build a client ID → name lookup
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => {
      if (c.id) map.set(c.id, c.clientName || c.businessName || 'Unknown Client');
    });
    return map;
  }, [clients]);

  // Flatten tasks into per-client rows
  const allRows = useMemo<ClientRow[]>(() => {
    const rows: ClientRow[] = [];

    tasks.forEach((task) => {
      const currentTask = localTasks[task.id!] || task;
      const hasMappings = currentTask.teamMemberMappings && currentTask.teamMemberMappings.length > 0;

      if (hasMappings) {
        currentTask.teamMemberMappings!.forEach((mapping) => {
          mapping.clientIds.forEach((clientId) => {
            rows.push({
              taskId: currentTask.id || '',
              task: currentTask,
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
                taskId: currentTask.id || '',
                task: currentTask,
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
            taskId: currentTask.id || '',
            task: currentTask,
            clientName: clientMap.get(clientId) || clientId,
            clientId,
            assignee: 'Unassigned',
          });
        });
      } else {
        rows.push({
          taskId: currentTask.id || '',
          task: currentTask,
          clientName: currentTask.title,
          clientId: '',
          assignee: 'Unassigned',
        });
      }
    });

    return rows;
  }, [tasks, clientMap, localTasks]);

  // Get unique assignees from rows
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
        row.task.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Use per-client progress
      const progress = getClientProgressSummary(row.task, row.clientId, workflowType);
      const matchesStatus =
        statusFilter === 'all' || progress.status === statusFilter;

      const matchesAssignee =
        assigneeFilter === 'all' || row.assignee === assigneeFilter;

      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [allRows, searchQuery, statusFilter, assigneeFilter, workflowType]);

  // Calculate summary stats from per-client progress
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let totalPercentage = 0;

    allRows.forEach((row) => {
      const progress = getClientProgressSummary(row.task, row.clientId, workflowType);
      totalPercentage += progress.percentage;
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
    };
  }, [allRows, workflowType]);

  const exportCSV = () => {
    const headers = ['Client', 'Allocated', 'Status', ...template.steps.map((s) => s.shortName), 'Progress'];
    const rows = filteredRows.map((row) => {
      const completedStepIds = getClientCompletedStepIds(row.task, row.clientId, workflowType);
      const steps = workflowType === 'TAR' ? row.task.tarSteps : row.task.statSteps;
      const progress = getClientProgressSummary(row.task, row.clientId, workflowType);
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
    a.download = `${workflowType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps = workflowType === 'TAR' ? tasks[0]?.tarSteps : tasks[0]?.statSteps;

  return (
    <div className="space-y-5">
      {/* ── Reporting header ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reporting overview</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">|</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Read-only — updates live</span>
      </div>

      {/* ── Stats cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Clients" value={stats.totalClients} color="text-gray-900 dark:text-white" />
        <StatCard label="Completed" value={stats.completed} color="text-green-600" />
        <StatCard label="In Progress" value={stats.inProgress} color="text-blue-600" />
        <StatCard label="Pending" value={stats.pending} color="text-amber-600" />
        <StatCard label="Avg. Progress" value={`${stats.avgCompletion}%`} color="text-gray-900 dark:text-white" highlight />
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
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
        <Button variant="outline" onClick={exportCSV} className="h-9 gap-2 text-sm">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* ─ Desktop table ────────────────────────────────────── */}
      <div className="hidden lg:block border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max whitespace-nowrap table-auto">
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
                const completedStepIds = getClientCompletedStepIds(row.task, row.clientId, workflowType);
                const progress = getClientProgressSummary(row.task, row.clientId, workflowType);

                return (
                  <tr
                    key={`${row.taskId}-${row.clientId}-${idx}`}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900 z-10 break-words" title={row.clientName}>
                      {row.clientName}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 truncate">
                      {row.assignee === 'Unassigned' ? (
                        <span
                          className="text-blue-600 hover:underline cursor-pointer"
                          onClick={() => handleAssignClick(row.task)}
                        >
                          Unassigned
                        </span>
                      ) : (
                        row.assignee
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={progress.status} />
                    </td>
                    {(steps || []).map((step) => {
                      const done = completedStepIds.includes(step.id);
                      return (
                        <td key={step.id} className="px-1 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                              done
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                            }`}
                            title={`${step.name} — ${done ? 'Completed' : 'Incomplete'}`}
                          >
                            {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
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
      </div>

      {/* ── Mobile card view ─────────────────────────────────── */}
      <div className="lg:hidden space-y-2.5">
        {filteredRows.map((row, idx) => {
          const completedStepIds = getClientCompletedStepIds(row.task, row.clientId, workflowType);
          const progress = getClientProgressSummary(row.task, row.clientId, workflowType);

          return (
            <Card key={`${row.taskId}-${row.clientId}-${idx}`} className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={row.clientName}>
                      {row.clientName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Assigned:{' '}
                      {row.assignee === 'Unassigned' ? (
                        <span
                          className="text-blue-600 hover:underline cursor-pointer"
                          onClick={() => handleAssignClick(row.task)}
                        >
                          Unassigned
                        </span>
                      ) : (
                        row.assignee
                      )}
                    </p>
                  </div>
                  <StatusBadge status={progress.status} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(steps || []).map((step) => {
                    const done = completedStepIds.includes(step.id);
                    return (
                      <span
                        key={step.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          done
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {step.shortName}
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

      {/* ── Legend footer ────────────────────────────────────── */}
      <div className="flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400 pt-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-gray-400" />
          <span>Incomplete</span>
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
      className={`rounded-lg border px-3.5 py-2.5 transition-colors ${
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40'
      }`}
    >
      <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold mt-0.5 ${color}`}>
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
