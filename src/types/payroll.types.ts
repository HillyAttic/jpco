/**
 * Payroll Types
 * Type definitions for the payroll/salary slip module
 */

import { Timestamp } from 'firebase/firestore';

export interface PayrollSettings {
  id?: string;
  companyName: string;
  companyAddress: string;
  logoUrl: string | null;
  basicPercentage: number;
  hraPercentage: number;
  specialPercentage: number;
  allowedPaidLeaves: number;
  includePaidLeavesInPaidDays: boolean; // When true, allowed paid leaves are added to paid days (only if employee has taken leave)
  footerNote: string;
  salaryFormula?: string; // Editable formula for salary calculation
  accessConfig?: Record<string, Record<string, boolean>>; // month-year key -> employeeId -> selected boolean
  updatedAt?: Timestamp;
}

export interface AttendanceBreakdown {
  present: number;
  wfh: number;
  approvedLeave: number;
  unapprovedLeave: number;
  halfDay: number;
  holiday: number;
  paidLeave: number;
  leaveTaken: number;
  unpaidLeave: number;
  paidDays: number;
}

export interface SalaryBreakup {
  basic: number;
  hra: number;
  special: number;
  totalDeductions: number;
  netSalary: number;
  epf?: number;
  esi?: number;
  professionalTax?: number;
  tds?: number;
  loanRecovery?: number;
  otherDeduction?: number;
}

export interface EmployeeSalary {
  id?: string;
  employeeId: string;
  name: string;
  employeeCode: string;
  designation: string;
  department: string;
  doj: string | null;
  pan: string | null;
  grossSalary: number;
  month: number;
  year: number;
  totalDaysInMonth: number;
  paidDays: number;
  attendanceBreakdown: AttendanceBreakdown;
  salaryBreakup: SalaryBreakup;
  slipNumber: string;
  generatedAt?: Timestamp;
  generatedBy: string;
  accessGranted: boolean;
}

export interface SalaryCalculationResult {
  attendanceBreakdown: AttendanceBreakdown;
  salaryBreakup: SalaryBreakup;
  totalDaysInMonth: number;
  paidDays: number;
}

// ── Salary Slip Template ─────────────────────────────────────────────────────
// Controls which fields appear on the salary slip, their labels, and
// which entire sections are visible.

export interface SalarySlipTemplateField {
  key: string;       // stable id, e.g. "pan", "basicWage"
  label: string;     // display label on the slip
  visible: boolean;  // whether the field is shown
}

export interface SalarySlipTemplateSection {
  key: string;        // "employeeDetails" | "attendance" | "earnings" | "deductions"
  title: string;      // section heading
  visible: boolean;   // entire section toggle
  fields: SalarySlipTemplateField[];
}

export interface SalarySlipTemplate {
  id?: string;
  title: string;                    // e.g. "Default Template"
  sections: SalarySlipTemplateSection[];
  showFooterNote: boolean;
  showSlipNumber: boolean;
  footerNote?: string;              // override per-template (falls back to settings)
  updatedAt?: Timestamp;
}

export const DEFAULT_SALARY_SLIP_TEMPLATE: Omit<SalarySlipTemplate, 'id' | 'updatedAt'> = {
  title: 'Default Template',
  showFooterNote: true,
  showSlipNumber: true,
  sections: [
    {
      key: 'employeeDetails',
      title: 'Employee Details',
      visible: true,
      fields: [
        { key: 'name',       label: 'Name of the Employee', visible: true },
        { key: 'pan',        label: 'PAN',                  visible: true },
        { key: 'employeeId', label: 'Employee ID',          visible: true },
        { key: 'department', label: 'Department',           visible: true },
        { key: 'designation',label: 'Designation',          visible: true },
        { key: 'doj',        label: 'Date of Joining',      visible: true },
      ],
    },
    {
      key: 'attendance',
      title: 'Attendance Details',
      visible: true,
      fields: [
        { key: 'totalDaysInMonth',  label: 'Total Days in Month', visible: true },
        { key: 'paidDays',          label: 'Paid Days',           visible: true },
        { key: 'present',           label: 'Present',             visible: true },
        { key: 'wfh',               label: 'WFH',                 visible: true },
        { key: 'holiday',           label: 'Holidays',            visible: true },
        { key: 'leaveTaken',        label: 'Leave Taken',         visible: true },
        { key: 'paidLeave',         label: 'Paid Leave',          visible: true },
        { key: 'unpaidLeave',       label: 'Unpaid Leave',        visible: true },
        { key: 'approvedLeave',     label: 'Approved Leave',      visible: true },
        { key: 'unapprovedLeave',   label: 'Unapproved Leave',    visible: true },
        { key: 'halfDay',           label: 'Half Day',            visible: true },
      ],
    },
    {
      key: 'earnings',
      title: 'Earnings',
      visible: true,
      fields: [
        { key: 'basic',    label: 'Basic Wage',          visible: true },
        { key: 'hra',      label: 'HRA',                 visible: true },
        { key: 'special',  label: 'Special Allowances',  visible: true },
      ],
    },
    {
      key: 'deductions',
      title: 'Deductions',
      visible: true,
      fields: [
        { key: 'epf',              label: 'EPF',                 visible: true },
        { key: 'esi',              label: 'ESI/Health Insurance',visible: true },
        { key: 'professionalTax',  label: 'Professional Tax',    visible: true },
        { key: 'tds',              label: 'TDS / Income Tax',    visible: true },
        { key: 'loanRecovery',     label: 'Loan Recovery',       visible: true },
        { key: 'otherDeduction',   label: 'Other Deduction',     visible: true },
      ],
    },
  ],
};
