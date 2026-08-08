/**
 * SalarySlipPreview Component
 * On-screen HTML/CSS preview of a salary slip
 * Supports template-driven rendering (sections/fields visibility + custom labels)
 */

'use client';

import { useMemo, useState } from 'react';
import { EmployeeSalary, PayrollSettings, SalarySlipTemplate } from '@/types/payroll.types';

interface SalarySlipPreviewProps {
  slip: EmployeeSalary;
  settings: PayrollSettings;
  template?: SalarySlipTemplate | null;
  /** When true, hides the Calculation Breakdown section (used for PDF generation) */
  forPDF?: boolean;
}

export function SalarySlipPreview({ slip, settings, template, forPDF = false }: SalarySlipPreviewProps) {
  const [showSteps, setShowSteps] = useState(true);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ── Template helpers ─────────────────────────────────────────────
  const sectionVisible = (key: string) =>
    !template || template.sections.find((s) => s.key === key)?.visible !== false;

  const getSectionFields = (sectionKey: string) => {
    const section = template?.sections.find((s) => s.key === sectionKey);
    if (!section) return null;
    return section.fields.filter((f) => f.visible);
  };

  const fieldLabel = (sectionKey: string, fieldKey: string) => {
    const fields = getSectionFields(sectionKey);
    if (!fields) return null;
    return fields.find((f) => f.key === fieldKey)?.label ?? null;
  };

  const earningsFields = getSectionFields('earnings');
  const deductionsFields = getSectionFields('deductions');
  const empFields = getSectionFields('employeeDetails');
  const attendanceFields = getSectionFields('attendance');

  const showFooter = template
    ? template.showFooterNote &&
      (template.sections.find((s) => s.key === 'deductions')?.visible !== false ||
       template.sections.find((s) => s.key === 'earnings')?.visible !== false)
    : true;

  const showSlipNo = template ? template.showSlipNumber : true;

  // ── Step-by-step calculation breakdown ──────────────────────────
  const calcData = useMemo(() => {
    const { attendanceBreakdown: ab, salaryBreakup: sb } = slip;
    const { leaveTaken, paidLeave, unpaidLeave } = ab;
    const gross = slip.grossSalary;

    const fmt = (n: number) => n.toLocaleString('en-IN');
    const fmtD = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const leaveDeduction = (gross * unpaidLeave) / 26;
    const netSalary = gross - leaveDeduction;

    return {
      fmt, fmtD,
      gross, unpaidLeave, leaveTaken, paidLeave,
      leaveDeduction, netSalary,
      sb,
    };
  }, [slip, settings]);

  // Footer note text
  const footerNoteText = template?.footerNote || settings.footerNote ||
    'This is a computer generated statement, does not require signature.';

  return (
    <div data-for-pdf={forPDF || undefined} className="bg-white text-black p-4 sm:p-6 md:p-8 max-w-[210mm] mx-auto font-sans">
      {/* Company Header */}
      <div className="text-center mb-4 sm:mb-6">
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Company Logo"
            className="h-12 sm:h-16 mx-auto mb-2"
          />
        )}
        <h1 className="text-xl sm:text-2xl font-bold">{settings.companyName}</h1>
        <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-line">{settings.companyAddress}</p>
      </div>

      {/* Title */}
      <div className="border-b-2 border-gray-800 pb-2 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-center">SALARY SLIP</h2>
        <p className="text-center text-xs sm:text-sm">
          Pay Slip for {monthNames[slip.month]}, {slip.year}
        </p>
      </div>

      {/* Employee Details */}
      {sectionVisible('employeeDetails') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-4 sm:mb-6 text-xs sm:text-sm">
          {empFields ? (
            empFields.map((f) => {
              let value: string = '-';
              switch (f.key) {
                case 'name':        value = slip.name; break;
                case 'pan':         value = slip.pan || '-'; break;
                case 'employeeId':  value = slip.employeeCode; break;
                case 'department':  value = slip.department || '-'; break;
                case 'designation': value = slip.designation || '-'; break;
                case 'doj':         value = formatDate(slip.doj); break;
                default:            value = '-';
              }
              return (
                <div key={f.key} className="flex justify-between">
                  <span className="text-gray-700">{f.label}:</span>
                  <span className="font-semibold">{value}</span>
                </div>
              );
            })
          ) : (
            // Fallback: no template → show all fields with hardcoded labels
            <>
              <div className="flex justify-between">
                <span className="text-gray-700">Name:</span>
                <span className="font-semibold">{slip.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">PAN:</span>
                <span className="font-semibold">{slip.pan || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Employee ID:</span>
                <span className="font-semibold">{slip.employeeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Department:</span>
                <span className="font-semibold">{slip.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Designation:</span>
                <span className="font-semibold">{slip.designation || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Date of Joining:</span>
                <span className="font-semibold">{formatDate(slip.doj)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Attendance Details */}
      {sectionVisible('attendance') && (
        <div className="border-t border-gray-300 pt-3 sm:pt-4 mb-4 sm:mb-6">
          <h3 className="font-bold mb-2 text-sm sm:text-base">
            {template?.sections.find((s) => s.key === 'attendance')?.title || 'Attendance Details'}
          </h3>
          {attendanceFields ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs sm:text-sm">
              {attendanceFields.map((f) => {
                let value: string | number = '-';
                switch (f.key) {
                  case 'totalDaysInMonth': value = slip.totalDaysInMonth; break;
                  case 'paidDays':         value = slip.paidDays; break;
                  case 'present':          value = slip.attendanceBreakdown.present; break;
                  case 'wfh':              value = slip.attendanceBreakdown.wfh; break;
                  case 'holiday':          value = slip.attendanceBreakdown.holiday; break;
                  case 'leaveTaken':       value = slip.attendanceBreakdown.leaveTaken; break;
                  case 'paidLeave':        value = slip.attendanceBreakdown.paidLeave; break;
                  case 'unpaidLeave':      value = slip.attendanceBreakdown.unpaidLeave; break;
                  case 'approvedLeave':    value = slip.attendanceBreakdown.approvedLeave; break;
                  case 'unapprovedLeave':  value = slip.attendanceBreakdown.unapprovedLeave; break;
                  case 'halfDay':          value = slip.attendanceBreakdown.halfDay; break;
                  default:                 value = '-';
                }
                return (
                  <div key={f.key} className="flex justify-between sm:justify-between">
                    <span className="text-gray-700">{f.label}:</span>
                    <span className="font-semibold ml-2">{value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback: no template → show all fields with hardcoded labels
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Days:</span>
                <span className="font-semibold ml-2">{slip.totalDaysInMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Paid Days:</span>
                <span className="font-semibold ml-2">{slip.paidDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Present:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">WFH:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.wfh}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Holidays:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.holiday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Leave Taken:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.leaveTaken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Paid Leave:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.paidLeave}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Unpaid Leave:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.unpaidLeave}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Approved Leave:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.approvedLeave}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Unapproved Leave:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.unapprovedLeave}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Half Day:</span>
                <span className="font-semibold ml-2">{slip.attendanceBreakdown.halfDay}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step Calculation Breakdown — hidden in PDF */}
      {!forPDF && (
        <div className="border-t border-gray-300 pt-3 sm:pt-4 mb-4 sm:mb-6">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div className="text-left">
              <h3 className="font-bold text-sm sm:text-base">Calculation Breakdown</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                See how the net salary was computed step by step
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform ${showSteps ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showSteps && (
            <div className="mt-3 space-y-3">
              {/* Salary Formula Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Salary Formula</p>
                <p className="font-mono text-[10px] sm:text-xs text-blue-900 font-bold">
                  Net Salary = Gross Salary − (Gross Salary × Unpaid Leaves) / 26
                </p>
                <p className="text-[10px] sm:text-xs text-blue-600 mt-1">
                  <span className="font-bold">Unpaid Leaves</span> = Total Leave Taken − Paid Leave
                  (up to {settings.allowedPaidLeaves} allowed)
                </p>
              </div>

              {/* Given */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-[11px] sm:text-xs">
                <p className="font-semibold text-gray-700 mb-1">Given:</p>
                <p className="text-gray-600 ml-2">Gross Salary = {calcData.fmt(calcData.gross)}</p>
                <p className="text-gray-600 ml-2">Unpaid Leaves = {calcData.unpaidLeave}</p>
              </div>

              {/* Calculation */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-[11px] sm:text-xs space-y-1">
                <p className="font-semibold text-gray-700 mb-1">Calculation:</p>
                <p className="text-gray-600 ml-2">Leave Deduction = ({calcData.fmt(calcData.gross)} × {calcData.unpaidLeave}) ÷ 26</p>
                <p className="text-gray-600 ml-2">Leave Deduction = {calcData.fmt(calcData.gross * calcData.unpaidLeave)} ÷ 26 = {calcData.fmtD(calcData.leaveDeduction)}</p>
                <p className="text-gray-600 ml-2">Net Salary = {calcData.fmt(calcData.gross)} − {calcData.fmtD(calcData.leaveDeduction)}</p>
                <p className="text-gray-800 font-semibold ml-2">Net Salary = {calcData.fmtD(calcData.netSalary)}</p>
              </div>

              {/* Breakdown Table */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-[11px] sm:text-xs">
                <p className="font-semibold text-gray-700 mb-1">Breakdown</p>
                <div className="ml-2 space-y-0.5">
                  <div className="flex justify-between max-w-[280px]">
                    <span className="text-gray-600">Gross Salary</span>
                    <span className="text-gray-800">{calcData.fmtD(calcData.gross)}</span>
                  </div>
                  <div className="flex justify-between max-w-[280px]">
                    <span className="text-gray-600">Unpaid Leaves</span>
                    <span className="text-gray-800">{calcData.unpaidLeave}</span>
                  </div>
                  <div className="flex justify-between max-w-[280px]">
                    <span className="text-gray-600">Leave Deduction</span>
                    <span className="text-gray-800">{calcData.fmtD(calcData.leaveDeduction)}</span>
                  </div>
                  <div className="flex justify-between max-w-[280px] border-t border-gray-300 pt-1 mt-1">
                    <span className="font-semibold text-gray-800">Net Salary</span>
                    <span className="font-semibold text-gray-800">{calcData.fmtD(calcData.netSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Subsequent Calculations */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-[11px] sm:text-xs space-y-1">
                <p className="font-semibold text-gray-700 mb-1">Subsequent Calculations:</p>
                <p className="text-gray-600 ml-2">Basic ({settings.basicPercentage}%) = {calcData.fmtD(calcData.netSalary)} × {settings.basicPercentage}% = {calcData.fmtD(calcData.sb.basic)}</p>
                <p className="text-gray-600 ml-2">HRA ({settings.hraPercentage}%) = {calcData.fmtD(calcData.netSalary)} × {settings.hraPercentage}% = {calcData.fmtD(calcData.sb.hra)}</p>
                <p className="text-gray-600 ml-2">Special Allowance ({settings.specialPercentage}%) = {calcData.fmtD(calcData.netSalary)} × {settings.specialPercentage}% = {calcData.fmtD(calcData.sb.special)}</p>
                <p className="text-gray-800 font-semibold ml-2 mt-1">Total = {calcData.fmtD(calcData.sb.basic)} + {calcData.fmtD(calcData.sb.hra)} + {calcData.fmtD(calcData.sb.special)} = {calcData.fmtD(calcData.netSalary)}</p>
              </div>
          </div>
          )}
        </div>
      )}

      {/* Earnings and Deductions */}
      {(sectionVisible('earnings') || sectionVisible('deductions')) && (
        <div className="border-t border-gray-300 pt-3 sm:pt-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            {/* Earnings Column */}
            {sectionVisible('earnings') && (
              <div>
                <h3 className="font-bold mb-2 sm:mb-3 text-center border-b border-gray-400 pb-2 text-sm sm:text-base">
                  {template?.sections.find((s) => s.key === 'earnings')?.title || 'Earnings'}
                </h3>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  {earningsFields ? (
                    earningsFields.map((f) => {
                      let value = 0;
                      switch (f.key) {
                        case 'basic':   value = slip.salaryBreakup.basic; break;
                        case 'hra':     value = slip.salaryBreakup.hra; break;
                        case 'special': value = slip.salaryBreakup.special; break;
                        default:        value = 0;
                      }
                      return (
                        <div key={f.key} className="flex justify-between">
                          <span>{f.label}</span>
                          <span>{formatCurrency(value)}</span>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback: no template → hardcoded
                    <>
                      <div className="flex justify-between">
                        <span>Basic Wage</span>
                        <span>{formatCurrency(slip.salaryBreakup.basic)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HRA</span>
                        <span>{formatCurrency(slip.salaryBreakup.hra)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special Allowances</span>
                        <span>{formatCurrency(slip.salaryBreakup.special)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold border-t border-gray-400 pt-2 mt-2">
                    <span>Total Earnings</span>
                    <span>{formatCurrency(slip.salaryBreakup.basic + slip.salaryBreakup.hra + slip.salaryBreakup.special)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Deductions Column */}
            {sectionVisible('deductions') && (
              <div>
                <h3 className="font-bold mb-2 sm:mb-3 text-center border-b border-gray-400 pb-2 text-sm sm:text-base">
                  {template?.sections.find((s) => s.key === 'deductions')?.title || 'Deductions'}
                </h3>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  {deductionsFields ? (
                    deductionsFields.map((f) => {
                      let value = 0;
                      switch (f.key) {
                        case 'epf':             value = slip.salaryBreakup?.epf ?? 0; break;
                        case 'esi':             value = slip.salaryBreakup?.esi ?? 0; break;
                        case 'professionalTax': value = slip.salaryBreakup?.professionalTax ?? 0; break;
                        case 'tds':             value = slip.salaryBreakup?.tds ?? 0; break;
                        case 'loanRecovery':    value = slip.salaryBreakup?.loanRecovery ?? 0; break;
                        case 'leaveDeduction':  value = calcData.leaveDeduction; break;
                        case 'otherDeduction':  value = slip.salaryBreakup?.otherDeduction ?? 0; break;
                        default:                value = 0;
                      }
                      return (
                        <div key={f.key} className="flex justify-between">
                          <span>{f.label}</span>
                          <span>{formatCurrency(value)}</span>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback: no template → hardcoded
                    <>
                      <div className="flex justify-between">
                        <span>EPF</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ESI/Health Insurance</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Professional Tax</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TDS / Income Tax</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Loan Recovery</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leave Deduction</span>
                        <span>{formatCurrency(calcData.leaveDeduction)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Deduction</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold border-t border-gray-400 pt-2 mt-2">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(slip.salaryBreakup.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Net Salary Box */}
      <div className="bg-gray-200 p-3 sm:p-4 rounded mb-4 sm:mb-6">
        <div className="flex justify-between items-center">
          <span className="text-base sm:text-lg font-bold">Net Salary</span>
          <span className="text-lg sm:text-xl font-bold">{formatCurrency(slip.salaryBreakup.netSalary)}</span>
        </div>
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="text-[10px] sm:text-xs text-gray-600 italic mt-6 sm:mt-8 pt-3 sm:pt-4 border-t border-gray-300">
          {footerNoteText}
        </div>
      )}

      {/* Slip Number */}
      {showSlipNo && (
        <div className="text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4">
          Slip No: {slip.slipNumber}
        </div>
      )}
    </div>
  );
}
