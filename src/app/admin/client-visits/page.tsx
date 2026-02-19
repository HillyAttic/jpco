'use client';

import { useState, useEffect } from 'react';
import { ClientVisit, ClientVisitStats } from '@/types/client-visit.types';
import { toast } from 'react-toastify';

export default function ClientVisitsPage() {
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [stats, setStats] = useState<ClientVisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    clientId: '',
    employeeId: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  useEffect(() => {
    fetchVisits();
    fetchStats();
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);

      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/client-visits?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVisits(data);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to load client visits');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');
      const response = await authenticatedFetch(`/api/client-visits/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchVisits();
    fetchStats();
  };

  const clearFilters = () => {
    setFilters({
      clientId: '',
      employeeId: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    setTimeout(() => {
      fetchVisits();
      fetchStats();
    }, 100);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Visits</h1>
        <p className="text-gray-600 dark:text-gray-400">Track employee visits to client locations</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-blue-600">{stats.totalVisits}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Visits</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-green-600">{stats.uniqueClients}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Unique Clients</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-purple-600">{stats.uniqueEmployees}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Employees</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="End Date"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="Search client or employee..."
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No client visits found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ARN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(visit.visitDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{visit.clientName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{visit.employeeName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {visit.taskTitle}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        visit.taskType === 'recurring' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {visit.taskType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {visit.arnNumber ? (
                        <div>
                          <div>{visit.arnNumber}</div>
                          {visit.arnName && <div className="text-xs text-gray-500">{visit.arnName}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Clients & Employees */}
      {stats && (stats.visitsByClient.length > 0 || stats.visitsByEmployee.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Top Clients */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Top Clients by Visits</h3>
            <div className="space-y-3">
              {stats.visitsByClient.slice(0, 5).map((client, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{client.clientName}</span>
                  <span className="text-sm font-medium text-blue-600">{client.count} visits</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Employees */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Top Employees by Visits</h3>
            <div className="space-y-3">
              {stats.visitsByEmployee.slice(0, 5).map((employee, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{employee.employeeName}</span>
                  <span className="text-sm font-medium text-green-600">{employee.count} visits</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
