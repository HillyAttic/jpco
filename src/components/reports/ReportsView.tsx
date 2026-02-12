'use client';

import React, { useState, useEffect } from 'react';
import { RecurringTask, recurringTaskService, TeamMemberMapping } from '@/services/recurring-task.service';
import { clientService, Client } from '@/services/client.service';
import { taskCompletionService, ClientTaskCompletion } from '@/services/task-completion.service';
import { XMarkIcon, CheckIcon, XCircleIcon, UserGroupIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { isFuture, isToday, startOfMonth } from 'date-fns';
import { useModal } from '@/contexts/modal-context';
import { exportToPDF, exportToExcel, exportSummaryToPDF, exportSummaryToExcel } from '@/utils/report-export.utils';

interface TaskReport {
  task: RecurringTask;
  clients: Client[];
  completionData: Map<string, Map<string, boolean>>; // clientId -> monthKey -> isCompleted
}

interface TeamMemberReport {
  userId: string;
  userName: string;
  clientIds: string[];
  clients: Client[];
  completionRate: number;
  completedCount: number;
  totalExpected: number;
}

export function ReportsView() {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [completions, setCompletions] = useState<Map<string, ClientTaskCompletion[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { openModal: openGlobalModal, closeModal: closeGlobalModal } = useModal();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Reports: Loading data...');

      const [tasksData, clientsData] = await Promise.all([
        recurringTaskService.getAll(),
        clientService.getAll(),
      ]);
      setTasks(tasksData);
      setClients(clientsData);

      console.log('Reports: Loaded tasks and clients', {
        tasksCount: tasksData.length,
        clientsCount: clientsData.length
      });

      // Load completions for all tasks
      const completionsMap = new Map<string, ClientTaskCompletion[]>();
      await Promise.all(
        tasksData.map(async (task) => {
          if (task.id) {
            const taskCompletions = await taskCompletionService.getByTaskId(task.id);
            completionsMap.set(task.id, taskCompletions);
            console.log(`Reports: Loaded completions for task ${task.title}`, {
              taskId: task.id,
              completionsCount: taskCompletions.length
            });
          }
        })
      );
      setCompletions(completionsMap);

      console.log('Reports: All data loaded successfully');
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: RecurringTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
    openGlobalModal(); // Notify global context to hide header
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    closeGlobalModal(); // Notify global context to show header
    // Reload data to reflect any changes made in the modal
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track task completion status across all clients</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Export Summary"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Export Summary</span>
              <span className="sm:hidden">Export</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => exportSummaryToPDF(tasks, clients, completions)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-t-lg transition-colors"
              >
                Export as PDF
              </button>
              <button
                onClick={() => exportSummaryToExcel(tasks, clients, completions)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-b-lg transition-colors"
              >
                Export as Excel
              </button>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-dark rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recurrence
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Clients
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200">
              {tasks.map((task) => {
                const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;

                // Get clients based on task type
                let taskClients: Client[];
                if (hasTeamMemberMapping) {
                  // For team member mapped tasks, get all clients from mappings
                  const allMappedClientIds = new Set<string>();
                  task.teamMemberMappings!.forEach(mapping => {
                    mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
                  });
                  taskClients = clients.filter(c => c.id && allMappedClientIds.has(c.id));
                } else {
                  // For regular tasks, use contactIds
                  taskClients = clients.filter(c => c.id && task.contactIds?.includes(c.id));
                }

                const taskCompletions = completions.get(task.id || '') || [];
                const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);

                return (
                  <tr key={task.id} className="hover:bg-gray-50 dark:bg-gray-800">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{task.title}</div>
                          {hasTeamMemberMapping && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap" title="Assigned via Team Member Mapping">
                              <UserGroupIcon className="w-3 h-3" />
                              <span className="hidden sm:inline">Team Mapped</span>
                              <span className="sm:hidden">Mapped</span>
                            </span>
                          )}
                        </div>
                        {/* Mobile: Show recurrence and client count */}
                        <div className="flex items-center gap-3 text-xs md:hidden">
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                            {task.recurrencePattern}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {hasTeamMemberMapping ? (
                              <span>{task.teamMemberMappings!.reduce((sum, m) => sum + m.clientIds.length, 0)} clients</span>
                            ) : (
                              <span>{taskClients.length} clients</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-600 text-white">
                        {task.recurrencePattern}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {hasTeamMemberMapping ? (
                        <span title={`${task.teamMemberMappings!.length} team member(s) assigned`}>
                          {task.teamMemberMappings!.reduce((sum, m) => sum + m.clientIds.length, 0)} (mapped)
                        </span>
                      ) : (
                        taskClients.length
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2 min-w-[60px]">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedTask && (
        <TaskReportModal
          task={selectedTask}
          clients={(() => {
            // For team member mapped tasks, get all clients from mappings
            if (selectedTask.teamMemberMappings && selectedTask.teamMemberMappings.length > 0) {
              const allMappedClientIds = new Set<string>();
              selectedTask.teamMemberMappings.forEach(mapping => {
                mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
              });
              return clients.filter(c => c.id && allMappedClientIds.has(c.id));
            }
            // For regular tasks, use contactIds
            return clients.filter(c => c.id && selectedTask.contactIds?.includes(c.id));
          })()}
          completions={completions.get(selectedTask.id || '') || []}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function calculateCompletionRate(
  task: RecurringTask,
  clientCount: number,
  taskCompletions: ClientTaskCompletion[]
): number {
  if (clientCount === 0) return 0;

  const months = generateMonths(task.recurrencePattern);
  const totalExpected = clientCount * months.filter(m => !isFuture(m.fullDate) || isToday(startOfMonth(m.fullDate))).length;

  if (totalExpected === 0) return 0;

  const completed = taskCompletions.filter(c => c.isCompleted).length;
  return Math.round((completed / totalExpected) * 100);
}

interface TaskReportModalProps {
  task: RecurringTask;
  clients: Client[];
  completions: ClientTaskCompletion[];
  onClose: () => void;
}

function TaskReportModal({ task, clients, completions, onClose }: TaskReportModalProps) {
  const months = generateMonths(task.recurrencePattern);
  const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;

  // If task has team member mappings, show team member reports
  if (hasTeamMemberMapping) {
    return <TeamMemberReportModal task={task} clients={clients} completions={completions} onClose={onClose} />;
  }

  // Otherwise show regular client report
  const completionData = buildCompletionData(completions, clients, months);

  const handleExportPDF = () => {
    exportToPDF({
      task,
      clients,
      completions,
      months,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      task,
      clients,
      completions,
      months,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-dark rounded-lg shadow-xl">
          <div className="sticky top-0 bg-white dark:bg-gray-dark border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">{task.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track completion for {clients.length} clients • {task.recurrencePattern} recurrence
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors self-end sm:self-auto"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                    Client Name
                  </th>
                  {months.map((month) => (
                    <th
                      key={month.key}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      <div>{month.monthName}</div>
                      <div className="text-xs font-normal text-gray-400">{month.year}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 dark:bg-gray-800">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-dark">
                      {client.name}
                    </td>
                    {months.map((month) => {
                      const status = getCompletionStatus(completionData, client.id || '', month.key, month.fullDate);
                      return (
                        <td key={month.key} className="px-4 py-4 whitespace-nowrap text-center">
                          {status === 'completed' && (
                            <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                          )}
                          {status === 'incomplete' && (
                            <XCircleIcon className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                          {status === 'future' && (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">Completed</span>
              </div>
              <div className="flex items-center">
                <XCircleIcon className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">Incomplete</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">-</span>
                <span className="text-gray-700 dark:text-gray-300">Future</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamMemberReportModalProps {
  task: RecurringTask;
  clients: Client[];
  completions: ClientTaskCompletion[];
  onClose: () => void;
}

function TeamMemberReportModal({ task, clients, completions, onClose }: TeamMemberReportModalProps) {
  const months = generateMonths(task.recurrencePattern);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Build team member reports
  const teamMemberReports: TeamMemberReport[] = (task.teamMemberMappings || []).map(mapping => {
    const memberClients = clients.filter(c => c.id && mapping.clientIds.includes(c.id));
    const memberCompletions = completions.filter(comp =>
      comp.isCompleted && mapping.clientIds.includes(comp.clientId)
    );

    const totalExpected = memberClients.length * months.filter(m => !isFuture(m.fullDate) || isToday(startOfMonth(m.fullDate))).length;
    const completedCount = memberCompletions.length;
    const completionRate = totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100) : 0;

    return {
      userId: mapping.userId,
      userName: mapping.userName,
      clientIds: mapping.clientIds,
      clients: memberClients,
      completionRate,
      completedCount,
      totalExpected,
    };
  });

  const selectedMember = selectedMemberId
    ? teamMemberReports.find(r => r.userId === selectedMemberId)
    : null;

  const displayClients = selectedMember ? selectedMember.clients : clients;
  const completionData = buildCompletionData(completions, displayClients, months);

  const handleExportPDF = () => {
    exportToPDF({
      task,
      clients: displayClients,
      completions,
      months,
      isTeamMemberView: !!selectedMember,
      teamMemberName: selectedMember?.userName,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      task,
      clients: displayClients,
      completions,
      months,
      isTeamMemberView: !!selectedMember,
      teamMemberName: selectedMember?.userName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-dark rounded-lg shadow-xl">
          <div className="sticky top-0 bg-white dark:bg-gray-dark border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">{task.title}</h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Team Member Reports • {task.recurrencePattern} recurrence
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors self-end sm:self-auto"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Team Member Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teamMemberReports.map(report => (
                <button
                  key={report.userId}
                  onClick={() => setSelectedMemberId(selectedMemberId === report.userId ? null : report.userId)}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${selectedMemberId === report.userId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{report.userName}</span>
                    </div>
                    {selectedMemberId === report.userId && (
                      <span className="text-xs font-medium text-blue-600 whitespace-nowrap ml-2">Selected</span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {report.clients.length} client{report.clients.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {report.completedCount} of {report.totalExpected} completed
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${report.completionRate}%` }}
                      ></div>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{report.completionRate}%</span>
                  </div>
                </button>
              ))}
            </div>

            {selectedMember && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-blue-900">
                  Showing {selectedMember.clients.length} client{selectedMember.clients.length !== 1 ? 's' : ''} assigned to {selectedMember.userName}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Completion: {selectedMember.completedCount} of {selectedMember.totalExpected} ({selectedMember.completionRate}%)
                </p>
              </div>
            )}
          </div>

          <div className="p-6 overflow-x-auto">
            {displayClients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedMember
                    ? `No clients assigned to ${selectedMember.userName}`
                    : 'No clients assigned to this task'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                      Client Name
                    </th>
                    {months.map((month) => (
                      <th
                        key={month.key}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        <div>{month.monthName}</div>
                        <div className="text-xs font-normal text-gray-400">{month.year}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200">
                  {displayClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:bg-gray-800">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-dark">
                        {client.name}
                      </td>
                      {months.map((month) => {
                        const status = getCompletionStatus(completionData, client.id || '', month.key, month.fullDate);
                        return (
                          <td key={month.key} className="px-4 py-4 whitespace-nowrap text-center">
                            {status === 'completed' && (
                              <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                            )}
                            {status === 'incomplete' && (
                              <XCircleIcon className="w-5 h-5 text-red-600 mx-auto" />
                            )}
                            {status === 'future' && (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">Completed</span>
              </div>
              <div className="flex items-center">
                <XCircleIcon className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">Incomplete</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">-</span>
                <span className="text-gray-700 dark:text-gray-300">Future</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMonths(recurrencePattern: string) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Start from current month
  const startYear = currentYear;
  const startMonth = currentMonth;

  // End at 5 years forward
  const endYear = currentYear + 5;
  const endMonth = 11; // December

  // Generate all months from current month to end
  const allMonths = [];
  for (let year = startYear; year <= endYear; year++) {
    const firstMonth = (year === startYear) ? startMonth : 0;
    const lastMonth = (year === endYear) ? endMonth : 11;

    for (let month = firstMonth; month <= lastMonth; month++) {
      const date = new Date(year, month, 1);
      allMonths.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        monthName: date.toLocaleDateString('en-US', { month: 'short' }),
        year: year.toString(),
        fullDate: date,
      });
    }
  }

  // Filter based on recurrence pattern
  switch (recurrencePattern) {
    case 'monthly':
      return allMonths; // Show all months
    case 'quarterly':
      return allMonths.filter((_, index) => index % 3 === 0);
    case 'half-yearly':
      return allMonths.filter((_, index) => index % 6 === 0);
    case 'yearly':
      return allMonths.filter((_, index) => index % 12 === 0);
    default:
      return allMonths;
  }
}

function buildCompletionData(
  completions: ClientTaskCompletion[],
  clients: Client[],
  months: any[]
): Map<string, Map<string, boolean>> {
  const data = new Map<string, Map<string, boolean>>();

  // Initialize data structure
  clients.forEach((client) => {
    if (client.id) {
      data.set(client.id, new Map<string, boolean>());
    }
  });

  // Populate with completion data
  completions.forEach((completion) => {
    const clientMap = data.get(completion.clientId);
    if (clientMap && completion.isCompleted) {
      clientMap.set(completion.monthKey, true);
    }
  });

  return data;
}

function getCompletionStatus(
  completionData: Map<string, Map<string, boolean>>,
  clientId: string,
  monthKey: string,
  monthDate: Date
): 'completed' | 'incomplete' | 'future' {
  const monthStart = startOfMonth(monthDate);

  // Check if the month is in the future
  if (isFuture(monthStart) && !isToday(monthStart)) {
    return 'future';
  }

  // Check completion status
  const clientData = completionData.get(clientId);
  if (clientData && clientData.get(monthKey)) {
    return 'completed';
  }

  return 'incomplete';
}
