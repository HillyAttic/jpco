'use client';

import React, { useState, useEffect } from 'react';
import { RecurringTask, recurringTaskService } from '@/services/recurring-task.service';
import { clientService, Client } from '@/services/client.service';
import { taskCompletionService, ClientTaskCompletion } from '@/services/task-completion.service';
import { XMarkIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { isFuture, isToday, startOfMonth } from 'date-fns';
import { useModal } from '@/contexts/modal-context';

interface TaskReport {
  task: RecurringTask;
  clients: Client[];
  completionData: Map<string, Map<string, boolean>>; // clientId -> monthKey -> isCompleted
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
      const [tasksData, clientsData] = await Promise.all([
        recurringTaskService.getAll(),
        clientService.getAll(),
      ]);
      setTasks(tasksData);
      setClients(clientsData);

      // Load completions for all tasks
      const completionsMap = new Map<string, ClientTaskCompletion[]>();
      await Promise.all(
        tasksData.map(async (task) => {
          if (task.id) {
            const taskCompletions = await taskCompletionService.getByTaskId(task.id);
            completionsMap.set(task.id, taskCompletions);
          }
        })
      );
      setCompletions(completionsMap);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Track task completion status across all clients</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurrence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Clients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => {
                const taskClients = clients.filter(c => task.contactIds?.includes(c.id));
                const taskCompletions = completions.get(task.id || '') || [];
                const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);
                
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {task.recurrencePattern}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {taskClients.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-700">{completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
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
          clients={clients.filter(c => selectedTask.contactIds?.includes(c.id))}
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
  const completionData = buildCompletionData(completions, clients, months);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track completion for {clients.length} clients • {task.recurrencePattern} recurrence
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Client Name
                  </th>
                  {months.map((month) => (
                    <th
                      key={month.key}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div>{month.monthName}</div>
                      <div className="text-xs font-normal text-gray-400">{month.year}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                      {client.name}
                    </td>
                    {months.map((month) => {
                      const status = getCompletionStatus(completionData, client.id, month.key, month.fullDate);
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

          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-700">Completed</span>
              </div>
              <div className="flex items-center">
                <XCircleIcon className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-gray-700">Incomplete</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">-</span>
                <span className="text-gray-700">Future Deadline</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMonths(recurrencePattern: string) {
  const months = [];
  const currentYear = new Date().getFullYear();
  const startMonth = 3; // April (0-indexed)
  
  for (let i = 0; i < 12; i++) {
    const monthIndex = (startMonth + i) % 12;
    const year = monthIndex < startMonth ? currentYear + 1 : currentYear;
    const date = new Date(year, monthIndex, 1);
    months.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      monthName: date.toLocaleDateString('en-US', { month: 'short' }),
      year: year.toString(),
      fullDate: date,
    });
  }

  // Filter based on recurrence pattern
  switch (recurrencePattern) {
    case 'monthly':
      return months;
    case 'quarterly':
      return months.filter((_, index) => index % 3 === 0);
    case 'half-yearly':
      return months.filter((_, index) => index % 6 === 0);
    case 'yearly':
      return [months[0]];
    default:
      return months;
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
    data.set(client.id, new Map<string, boolean>());
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
