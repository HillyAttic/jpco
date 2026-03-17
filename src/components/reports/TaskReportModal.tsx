'use client';

import React, { useState } from 'react';
import { RecurringTask } from '@/services/recurring-task.service';
import { Client } from '@/services/client.service';
import { ClientTaskCompletion } from '@/services/task-completion.service';
import { XMarkIcon, CheckIcon, XCircleIcon, UserGroupIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { isFuture, isToday, startOfMonth } from 'date-fns';
import { exportToPDF, exportToExcel } from '@/utils/report-export.utils';
import { generateMonths, buildCompletionData, getCompletionStatus, MonthData } from '@/utils/report-utils';

export interface TaskReportModalProps {
  task: RecurringTask;
  clients: Client[];
  completions: ClientTaskCompletion[];
  onClose: () => void;
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

function TeamMemberReportModal({ task, clients, completions, onClose }: TaskReportModalProps) {
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
                        {client.clientName}
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

export function TaskReportModal({ task, clients, completions, onClose }: TaskReportModalProps) {
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
                      {client.clientName}
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
