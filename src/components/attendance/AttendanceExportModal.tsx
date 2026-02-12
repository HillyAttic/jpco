'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, Loader2, Calendar, Users } from 'lucide-react';
import { employeeService } from '@/services/employee.service';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Admin' | 'Employee';
  status: 'active' | 'on-leave' | 'terminated';
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  clockIn: Date;
  clockOut?: Date;
  location?: {
    clockIn?: { latitude: number; longitude: number };
    clockOut?: { latitude: number; longitude: number };
  };
  totalHours: number;
  status: 'active' | 'completed' | 'incomplete';
}

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedEmployeeId?: string;
  preSelectedStartDate?: Date;
  preSelectedEndDate?: Date;
}

export function AttendanceExportModal({ 
  isOpen, 
  onClose,
  preSelectedEmployeeId,
  preSelectedStartDate,
  preSelectedEndDate
}: AttendanceExportModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      try {
        const allEmployees = await employeeService.getAll();
        const activeEmployees = allEmployees.filter(emp => emp.status === 'active');
        
        // Sort employees: pre-selected first, then alphabetically
        if (preSelectedEmployeeId) {
          const sortedEmployees = activeEmployees.sort((a, b) => {
            if (a.id === preSelectedEmployeeId) return -1;
            if (b.id === preSelectedEmployeeId) return 1;
            return a.name.localeCompare(b.name);
          });
          setEmployees(sortedEmployees);
        } else {
          setEmployees(activeEmployees.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadEmployees();
      
      // Set default dates based on pre-selected or current month
      if (preSelectedStartDate && preSelectedEndDate) {
        setStartDate(preSelectedStartDate.toISOString().split('T')[0]);
        setEndDate(preSelectedEndDate.toISOString().split('T')[0]);
      } else {
        // Default to first and last day of current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(lastDay.toISOString().split('T')[0]);
      }
      
      // Pre-select employee if provided
      if (preSelectedEmployeeId) {
        setSelectedEmployees([preSelectedEmployeeId]);
        setSelectAll(false);
      } else {
        setSelectedEmployees([]);
        setSelectAll(false);
      }
      
      // Reset search query
      setSearchQuery('');
    }
  }, [isOpen, preSelectedEmployeeId, preSelectedStartDate, preSelectedEndDate]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id!));
    }
    setSelectAll(!selectAll);
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle individual employee selection
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Convert Firestore timestamp to Date
  const convertTimestamp = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    
    try {
      if (timestamp instanceof Date) return timestamp;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000);
      }
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? undefined : date;
      }
      return undefined;
    } catch (error) {
      console.error('Error converting timestamp:', error);
      return undefined;
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const records: AttendanceRecord[] = [];

    for (const employeeId of selectedEmployees) {
      const q = query(
        collection(db, 'attendance-records'),
        where('employeeId', '==', employeeId),
        where('clockIn', '>=', Timestamp.fromDate(start)),
        where('clockIn', '<=', Timestamp.fromDate(end)),
        orderBy('clockIn', 'desc')
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        records.push({
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          clockIn: convertTimestamp(data.clockIn)!,
          clockOut: convertTimestamp(data.clockOut),
          location: data.location,
          totalHours: data.totalHours || 0,
          status: data.status || 'completed',
        });
      });
    }

    return records.sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime());
  };

  // Calculate duration
  const calculateDuration = (clockIn: Date, clockOut?: Date): string => {
    if (!clockOut) return 'In Progress';
    
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  };

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const records = await fetchAttendanceRecords();

      const data = records.map(record => ({
        'Employee Name': record.employeeName,
        'Date': record.clockIn.toLocaleDateString('en-US'),
        'Clock In': record.clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        'Clock Out': record.clockOut ? record.clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        'Duration': calculateDuration(record.clockIn, record.clockOut),
        'Status': record.clockOut ? 'Completed' : 'Active',
        'Clock In Location': record.location?.clockIn 
          ? `${record.location.clockIn.latitude.toFixed(4)}, ${record.location.clockIn.longitude.toFixed(4)}`
          : 'N/A',
        'Clock Out Location': record.location?.clockOut 
          ? `${record.location.clockOut.latitude.toFixed(4)}, ${record.location.clockOut.longitude.toFixed(4)}`
          : 'N/A',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      // Auto-size columns
      const maxWidth = data.reduce((w, r) => Math.max(w, r['Employee Name'].length), 10);
      ws['!cols'] = [
        { wch: maxWidth },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
      ];

      const fileName = `Attendance_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

      onClose();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true);
    try {
      const records = await fetchAttendanceRecords();

      const doc = new jsPDF('landscape');
      
      // Add title
      doc.setFontSize(18);
      doc.text('Attendance Report', 14, 20);
      
      // Add date range
      doc.setFontSize(11);
      doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

      // Prepare table data
      const tableData = records.map(record => [
        record.employeeName,
        record.clockIn.toLocaleDateString('en-US'),
        record.clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        record.clockOut ? record.clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        calculateDuration(record.clockIn, record.clockOut),
        record.clockOut ? 'Completed' : 'Active',
      ]);

      // Add table
      autoTable(doc, {
        startY: 40,
        head: [['Employee', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
        },
      });

      const fileName = `Attendance_${startDate}_to_${endDate}.pdf`;
      doc.save(fileName);

      onClose();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle export
  const handleExport = () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before end date');
      return;
    }

    if (exportFormat === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Attendance Records
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Select Date Range</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4" />
                <span>Select Employees</span>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search employees by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No employees found matching your search
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-60 overflow-y-auto">
                {filteredEmployees.map((employee) => {
                  const isPreSelected = employee.id === preSelectedEmployeeId;
                  return (
                    <label
                      key={employee.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        isPreSelected
                          ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id!)}
                        onChange={() => handleEmployeeToggle(employee.id!)}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${isPreSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {employee.name}
                          {isPreSelected && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${isPreSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {employee.role} • {employee.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
              {searchQuery && ` • ${filteredEmployees.length} found`}
            </div>
          </div>

          {/* Export Format Selection */}
          <div className="space-y-4">
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExportFormat('excel')}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                  exportFormat === 'excel'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileSpreadsheet className={`w-6 h-6 ${exportFormat === 'excel' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Excel</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">.xlsx format</div>
                </div>
              </button>

              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <FileText className={`w-6 h-6 ${exportFormat === 'pdf' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">PDF</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">.pdf format</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedEmployees.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
