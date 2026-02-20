'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MagnifyingGlassIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

interface VisitRecord {
  date: string;
  employeeName: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  taskTitle: string;
  taskType?: 'recurring' | 'non-recurring';
  attendanceStatus?: 'present' | 'absent' | 'incomplete' | 'no-data';
  attendanceDetails?: {
    clockIn?: string;
    clockOut?: string;
    totalHours?: number;
  };
}

interface MonthlyVisits {
  month: string;
  monthName: string;
  visits: VisitRecord[];
  totalVisits: number;
}

interface ClientMonthlyReport {
  clientId: string;
  clientName: string;
  monthlyData: MonthlyVisits[];
  totalVisits: number;
}

export default function ClientVisitsPage() {
  const [clientReports, setClientReports] = useState<ClientMonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClientReports();
  }, []);

  const fetchClientReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/client-visits/monthly-report?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setClientReports(data.clients || []);
      } else {
        toast.error('Failed to load client visit reports');
      }
    } catch (error) {
      console.error('Error fetching client reports:', error);
      toast.error('Failed to load client visit reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClientReports();
  };

  const handleClear = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchClientReports(), 100);
  };

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleMonth = (key: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMonths(newExpanded);
  };

  const totalVisitsAcrossClients = clientReports.reduce((sum, client) => sum + client.totalVisits, 0);

  const getAttendanceStatusBadge = (status?: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            ✓ Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            ✗ Absent
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            ⚠ Incomplete
          </span>
        );
      case 'no-data':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            - Scheduled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Visit Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Monthly visit reports organized by client</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">{clientReports.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Clients</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">{totalVisitsAcrossClients}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Visits</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-purple-600">
            {clientReports.reduce((sum, c) => sum + c.monthlyData.length, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Months</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Search client name..."
            />
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="End Date"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Search
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Client Reports */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading client reports...</p>
        </div>
      ) : clientReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No client visits found</p>
          {searchTerm && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Try adjusting your search criteria
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {clientReports.map((client) => (
            <div
              key={client.clientId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              {/* Client Header */}
              <button
                onClick={() => toggleClient(client.clientId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-300 font-semibold text-lg">
                      {client.clientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {client.clientName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.totalVisits} total visit{client.totalVisits !== 1 ? 's' : ''} across {client.monthlyData.length} month{client.monthlyData.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedClients.has(client.clientId) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Monthly Data */}
              {expandedClients.has(client.clientId) && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {client.monthlyData.map((monthData) => {
                    const monthKey = `${client.clientId}-${monthData.month}`;
                    return (
                      <div key={monthData.month} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        {/* Month Header */}
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {monthData.monthName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({monthData.totalVisits} visit{monthData.totalVisits !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedMonths.has(monthKey) ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Visit Records */}
                        {expandedMonths.has(monthKey) && (
                          <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {monthData.visits.map((visit, idx) => (
                              <div
                                key={idx}
                                className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                              >
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex-1 min-w-[120px]">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {new Date(visit.date).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {visit.startTime !== '-' ? `${visit.startTime} - ${visit.endTime}` : 'No time set'}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-[150px]">
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {visit.employeeName}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {visit.taskTitle}
                                      </span>
                                      {visit.taskType && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          visit.taskType === 'recurring'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                        }`}>
                                          {visit.taskType === 'recurring' ? 'Recurring' : 'Non-Recurring'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-[150px]">
                                    <div className="flex flex-col gap-1">
                                      {getAttendanceStatusBadge(visit.attendanceStatus)}
                                      {visit.attendanceDetails && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {visit.attendanceDetails.clockIn && (
                                            <div>In: {visit.attendanceDetails.clockIn}</div>
                                          )}
                                          {visit.attendanceDetails.clockOut && (
                                            <div>Out: {visit.attendanceDetails.clockOut}</div>
                                          )}
                                          {visit.attendanceDetails.totalHours !== undefined && (
                                            <div className="font-medium text-gray-600 dark:text-gray-300">
                                              {visit.attendanceDetails.totalHours.toFixed(2)}h worked
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
