/**
 * Admin Salary Config Page
 * Admin page for configuring payroll settings, employee salaries, and generating slips
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PayrollSettings } from '@/types/payroll.types';
import { payrollService } from '@/services/payroll.service';
import { authenticatedFetch } from '@/lib/api-client';
import { SalaryConfigModal } from '@/components/payroll/SalaryConfigModal';
import { PayrollSettingsForm } from '@/components/payroll/PayrollSettingsForm';
import { GenerateSlipsPanel } from '@/components/payroll/GenerateSlipsPanel';
import { TemplateManager } from '@/components/payroll/TemplateManager';
import { FormulaEditor } from '@/components/payroll/FormulaEditor';
import dynamic from 'next/dynamic';
import {
  Users,
  FileText,
  LayoutTemplate,
  Settings,
  FunctionSquare,
  IndianRupee,
} from 'lucide-react';

// Lazy load the attendance calendar modal (same as used in attendance tray)
const AttendanceCalendarModal = dynamic(() => import('@/components/attendance/AttendanceCalendarModal').then(mod => ({ default: mod.AttendanceCalendarModal })), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
  ssr: false,
});

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  designation?: string;
  doj?: string | null;
  pan?: string | null;
  grossSalary?: number;
  status: string;
}

const TABS = [
  {
    value: 'employees',
    label: 'Employee Salaries',
    icon: Users,
  },
  {
    value: 'generate',
    label: 'Generate Slips',
    icon: FileText,
  },
  {
    value: 'templates',
    label: 'Slip Templates',
    icon: LayoutTemplate,
  },
  {
    value: 'settings',
    label: 'Payroll Settings',
    icon: Settings,
  },
  {
    value: 'formula',
    label: 'Formula',
    icon: FunctionSquare,
  },
] as const;

export default function AdminSalaryConfigPage() {
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');

  // Attendance calendar modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchEmployees();
  }, []);

  const fetchSettings = async () => {
    const data = await payrollService.getSettings();
    if (data) {
      setSettings(data);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/employees');
      if (response.ok) {
        const json = await response.json();
        const list: Employee[] = Array.isArray(json) ? json : json.data ?? [];
        setEmployees(
          list
            .filter(emp => emp.status === 'active')
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    } catch (error) {
      toast.error('Failed to fetch employees');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSalary = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleSaveSalary = async (data: {
    doj?: string | null;
    pan?: string | null;
    designation: string;
    grossSalary: number;
  }) => {
    if (!selectedEmployee) return;

    setModalLoading(true);
    try {
      const response = await authenticatedFetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      // Refresh employees list
      await fetchEmployees();
    } catch (error) {
      throw error;
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
          <IndianRupee className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure payroll settings, employee salaries, and generate salary slips
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Employee Salaries */}
        <TabsContent value="employees">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                Configure Employee Salaries
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Set DOJ, PAN, Designation, and Gross Salary for each employee
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">
                        Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]">
                        Emp ID
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">
                        Department
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">
                        Designation
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]">
                        DOJ
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">
                        PAN
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">
                        Gross Salary
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%] sticky right-0 bg-gray-50 dark:bg-gray-700/50 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {employees.map((employee, index) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                          <button
                            onClick={() => {
                              setSelectedEmployeeForAttendance({ id: employee.id, name: employee.name });
                              setShowAttendanceModal(true);
                            }}
                            className="hover:underline cursor-pointer text-left"
                            title={employee.name}
                          >
                            {employee.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                          {employee.employeeId}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white truncate" title={employee.department}>
                          {employee.department || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white truncate" title={employee.designation}>
                          {employee.designation || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                          {employee.doj ? new Date(employee.doj).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white font-mono">
                          {employee.pan || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                          {employee.grossSalary ? `₹${employee.grossSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-right sticky right-0 bg-white dark:bg-gray-800 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfigureSalary(employee)}
                          >
                            Configure
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Generate Slips */}
        <TabsContent value="generate">
          <GenerateSlipsPanel
            settings={settings}
            onGenerationComplete={fetchEmployees}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        </TabsContent>

        {/* Tab 3: Payroll Settings */}
        <TabsContent value="settings">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              Payroll Settings
            </h2>
            <PayrollSettingsForm onSaveSuccess={fetchSettings} />
          </div>
        </TabsContent>

        {/* Tab 4: Slip Templates */}
        <TabsContent value="templates">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <TemplateManager />
          </div>
        </TabsContent>

        {/* Tab 5: Formula */}
        <TabsContent value="formula">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <FormulaEditor
              settings={settings}
              onSaveSuccess={fetchSettings}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Salary Config Modal */}
      <SalaryConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSalary}
        employee={selectedEmployee}
        isLoading={modalLoading}
      />

      {/* Attendance Calendar Modal */}
      {selectedEmployeeForAttendance && (
        <AttendanceCalendarModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedEmployeeForAttendance(null);
          }}
          employeeId={selectedEmployeeForAttendance.id}
          employeeName={selectedEmployeeForAttendance.name}
        />
      )}
    </div>
  );
}
