'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useModal } from '@/contexts/modal-context';

interface AttendanceDay {
  date: Date;
  status: 'present' | 'absent' | 'leave' | 'pending';
  hours?: number;
}

interface EmployeeAttendance {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  days: AttendanceDay[];
  stats: {
    present: number;
    absent: number;
    leave: number;
    totalHours: number;
  };
}

export default function AttendanceRosterPage() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendance | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    fetchAttendanceData();
  }, [month, year]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);

      // Import authenticated fetch helper
      const { authenticatedFetch } = await import('@/lib/api-client');

      // Fetch all employees
      const employeesRes = await authenticatedFetch('/api/employees');
      if (!employeesRes.ok) throw new Error('Failed to fetch employees');
      const employeesRaw = await employeesRes.json();
      // /api/employees returns { data: Employee[], total: number } — extract safely
      const employeesData: any[] = Array.isArray(employeesRaw)
        ? employeesRaw
        : Array.isArray(employeesRaw?.data)
          ? employeesRaw.data
          : [];
      console.log('[AttendanceRoster] employees fetched:', employeesData.length);

      // Fetch attendance records for the month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const attendanceRes = await authenticatedFetch(
        `/api/attendance/records?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const attendanceRaw = attendanceRes.ok ? await attendanceRes.json() : [];
      const attendanceData: any[] = Array.isArray(attendanceRaw)
        ? attendanceRaw
        : Array.isArray(attendanceRaw?.data)
          ? attendanceRaw.data
          : [];

      // Fetch leave requests for the month
      const leaveRes = await authenticatedFetch(
        `/api/leave-requests?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const leaveRaw = leaveRes.ok ? await leaveRes.json() : [];
      const leaveData: any[] = Array.isArray(leaveRaw)
        ? leaveRaw
        : Array.isArray(leaveRaw?.data)
          ? leaveRaw.data
          : [];

      // Build attendance roster
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const roster: EmployeeAttendance[] = employeesData.map((emp: any) => {
        const days: AttendanceDay[] = [];
        let presentCount = 0;
        let absentCount = 0;
        let leaveCount = 0;
        let totalHours = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];

          // Check attendance
          const attendance = attendanceData.find(
            (a: any) => a.employeeId === emp.id &&
              new Date(a.clockIn).toISOString().split('T')[0] === dateStr
          );

          // Check leave
          const leave = leaveData.find(
            (l: any) => l.employeeId === emp.id &&
              l.status === 'approved' &&
              new Date(l.startDate) <= date &&
              new Date(l.endDate) >= date
          );

          let status: 'present' | 'absent' | 'leave' | 'pending' = 'pending';
          let hours = 0;

          if (leave) {
            status = 'leave';
            leaveCount++;
          } else if (attendance) {
            status = 'present';
            hours = attendance.totalHours || 0;
            presentCount++;
            totalHours += hours;
          } else if (date < new Date()) {
            status = 'absent';
            absentCount++;
          }

          days.push({ date, status, hours });
        }

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          employeeEmail: emp.email,
          days,
          stats: {
            present: presentCount,
            absent: absentCount,
            leave: leaveCount,
            totalHours,
          },
        };
      });

      setEmployees(roster);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'leave': return 'bg-blue-500';
      case 'pending': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openEmployeeModal = (employee: EmployeeAttendance) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    openModal();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Roster</h1>
        <p className="text-gray-600 dark:text-gray-400">Monthly attendance overview for all employees</p>
      </div>

      {/* Month/Year Selector */}
      <div className="mb-6 flex gap-4 items-center">
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        >
          {monthNames.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={fetchAttendanceData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="mb-6 flex gap-6 items-center bg-white dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Leave (Approved)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Pending/Future</span>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700">
                    Employee
                  </th>
                  {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                    <th key={day} className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300">
                      {day}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map((employee) => (
                  <tr key={employee.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800">
                      <button
                        onClick={() => openEmployeeModal(employee)}
                        className="text-left hover:text-blue-600"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{employee.employeeName}</div>
                        <div className="text-xs text-gray-500">{employee.employeeEmail}</div>
                      </button>
                    </td>
                    {employee.days.map((day, idx) => (
                      <td key={idx} className="px-2 py-3">
                        <div
                          className={`w-6 h-6 rounded ${getStatusColor(day.status)} mx-auto cursor-pointer`}
                          title={`${day.date.toLocaleDateString()}: ${day.status}${day.hours ? ` (${day.hours.toFixed(1)}h)` : ''}`}
                        ></div>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        <div className="text-green-600">P: {employee.stats.present}</div>
                        <div className="text-red-600">A: {employee.stats.absent}</div>
                        <div className="text-blue-600">L: {employee.stats.leave}</div>
                        <div className="text-gray-600 dark:text-gray-400">H: {employee.stats.totalHours.toFixed(1)}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEmployee.employeeName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEmployee.employeeEmail}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {monthNames[month]} {year} - Attendance Overview
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  closeModal();
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{selectedEmployee.stats.present}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Present Days</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{selectedEmployee.stats.absent}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Absent Days</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedEmployee.stats.leave}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Leave Days</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedEmployee.stats.totalHours.toFixed(1)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
              </div>
            </div>

            {/* Calendar View */}
            <div className="grid grid-cols-7 gap-2">
              {selectedEmployee.days.map((day, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getStatusColor(day.status)} bg-opacity-20 border-opacity-50`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{day.date.getDate()}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{day.status}</div>
                  {day.hours && day.hours > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">{day.hours.toFixed(1)}h</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
