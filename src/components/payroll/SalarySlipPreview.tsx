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
  const [showSteps, setShowSteps] = useState(false);
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
  const steps = useMemo(() => {
    const { totalDaysInMonth, paidDays, attendanceBreakdown: ab, salaryBreakup: sb } = slip;
    const { holiday, present, wfh, approvedLeave, unapprovedLeave, halfDay, leaveTaken, paidLeave, unpaidLeave } = ab;
    const gross = slip.grossSalary;
    const totalWorkingDays = totalDaysInMonth - holiday;

    const fmt = (n: number) => n.toLocaleString('en-IN');
    const fmtD = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return [
      { label: 'Total Days in Month', formula: `${fmt(totalDaysInMonth)}` },
      { label: 'Holidays', formula: `${fmt(holiday)}` },
      { label: 'Total Working Days', formula: `${fmt(totalDaysInMonth)} - ${fmt(holiday)} = ${fmt(totalWorkingDays)}` },
      { label: 'Present', formula: `${fmt(present)}` },
      { label: 'Approved Leave', formula: `${fmt(approvedLeave)}` },
      { label: 'Unapproved Leave', formula: `${fmt(totalWorkingDays)} - ${fmt(present)} - ${fmt(wfh)} - ${fmt(approvedLeave)} - (${fmt(halfDay)} × 0.5) = ${fmt(unapprovedLeave)}` },
      { label: 'Leave Taken', formula: `${fmt(approvedLeave)} + ${fmt(unapprovedLeave)} = ${fmt(leaveTaken)}` },
      { label: 'Paid Leave', formula: `MIN(${fmt(leaveTaken)}, ${fmt(settings.allowedPaidLeaves)}) = ${fmt(paidLeave)}` },
      { label: 'Unpaid Leave', formula: `MAX(0, ${fmt(leaveTaken)} - ${fmt(paidLeave)}) = ${fmt(unpaidLeave)}` },
      { label: 'Paid Days', formula: `26 - ${fmt(unpaidLeave)} - (${fmt(halfDay)} × 0.5) = ${fmt(paidDays)}` },
      { label: 'Prorated Gross', formula: `${fmt(gross)} × (${fmt(paidDays)} / 26) = ${fmtD(gross * paidDays / 26)}` },
      { label: `Basic (${settings.basicPercentage}%)`, formula: `${fmtD(sb.basic)}` },
      { label: `HRA (${settings.hraPercentage}%)`, formula: `${fmtD(sb.hra)}` },
      { label: `Special (${settings.specialPercentage}%)`, formula: `${fmtD(sb.special)}` },
      { label: 'Net Salary', formula: `${fmt(sb.basic)} + ${fmt(sb.hra)} + ${fmt(sb.special)} - ${fmt(sb.totalDeductions)} = ₹${fmt(sb.netSalary)}` },
    ];
  }, [slip, settings]);

  // Footer note text
  const footerNoteText = template?.footerNote || settings.footerNote ||
    'This is a computer generated statement, does not require signature.';

  return (
    <div className="bg-white text-black p-8 max-w-[210mm] mx-auto font-sans">
      {/* Company Header */}
      <div className="text-center mb-6">
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Company Logo"
            className="h-16 mx-auto mb-2"
          />
        )}
        <h1 className="text-2xl font-bold">{settings.companyName}</h1>
        <p className="text-sm text-gray-600 whitespace-pre-line">{settings.companyAddress}</p>
      </div>

      {/* Title */}
      <div className="border-b-2 border-gray-800 pb-2 mb-6">
        <h2 className="text-xl font-bold text-center">SALARY SLIP</h2>
        <p className="text-center text-sm">
          Pay Slip for {monthNames[slip.month]}, {slip.year}
        </p>
      </div>

      {/* Employee Details */}
      {sectionVisible('employeeDetails') && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
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
                <div key={f.key} className="flex">
                  <span className="font-semibold w-40">{f.label}:</span>
                  <span>{value}</span>
                </div>
              );
            })
          ) : (
            // Fallback: no template → show all fields with hardcoded labels
            <>
              <div className="flex">
                <span className="font-semibold w-40">Name of the Employee:</span>
                <span>{slip.name}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">PAN:</span>
                <span>{slip.pan || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Employee ID:</span>
                <span>{slip.employeeCode}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Department:</span>
                <span>{slip.department || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-40">Designation:</span>
                <span>{slip.designation || '-'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-32">Date of Joining:</span>
                <span>{formatDate(slip.doj)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Attendance Details */}
      {sectionVisible('attendance') && (
        <div className="border-t border-gray-300 pt-4 mb-6">
          <h3 className="font-bold mb-2">
            {template?.sections.find((s) => s.key === 'attendance')?.title || 'Attendance Details'}
          </h3>
          {attendanceFields ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
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
                  <div key={f.key} className="flex justify-between">
                    <span>{f.label}:</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback: no template → show all fields with hardcoded labels
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Total Days in Month:</span>
                <span className="font-semibold">{slip.totalDaysInMonth}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Days:</span>
                <span className="font-semibold">{slip.paidDays}</span>
              </div>
              <div className="flex justify-between">
                <span>Present:</span>
                <span>{slip.attendanceBreakdown.present}</span>
              </div>
              <div className="flex justify-between">
                <span>WFH:</span>
                <span>{slip.attendanceBreakdown.wfh}</span>
              </div>
              <div className="flex justify-between">
                <span>Holidays:</span>
                <span>{slip.attendanceBreakdown.holiday}</span>
              </div>
              <div className="flex justify-between">
                <span>Leave Taken:</span>
                <span>{slip.attendanceBreakdown.leaveTaken}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Leave:</span>
                <span>{slip.attendanceBreakdown.paidLeave}</span>
              </div>
              <div className="flex justify-between">
                <span>Unpaid Leave:</span>
                <span>{slip.attendanceBreakdown.unpaidLeave}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved Leave:</span>
                <span>{slip.attendanceBreakdown.approvedLeave}</span>
              </div>
              <div className="flex justify-between">
                <span>Unapproved Leave:</span>
                <span>{slip.attendanceBreakdown.unapprovedLeave}</span>
              </div>
              <div className="flex justify-between">
                <span>Half Day:</span>
                <span>{slip.attendanceBreakdown.halfDay}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step Calculation Breakdown — hidden in PDF */}
      {!forPDF && (
        <div className="border-t border-gray-300 pt-4 mb-6">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <div>
              <h3 className="font-bold text-left">Calculation Breakdown</h3>
              <p className="text-xs text-gray-500 mt-0.5 text-left">
                See how the net salary was computed step by step — from total days to final take-home pay
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
              className={`h-5 w-5 text-gray-400 transition-transform ${showSteps ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showSteps && (
            <div className="mt-3 space-y-3">
              {/* Salary Formula Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Salary Formula</p>
                <p className="font-mono text-sm text-blue-900 font-bold">
                  Net Salary = Gross Salary − (Gross Salary × Unpaid Leaves) / 26
                </p>
                <p className="text-xs text-blue-600 mt-1.5">
                  Denominator is always <span className="font-bold">26</span> (fixed working days per month).
                  Paid days = 26 − unpaid leaves − (half days × 0.5)
                </p>
              </div>

              {/* Step-by-Step Calculation */}
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs space-y-1.5">
                {steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-400 w-7 shrink-0 text-right">{i + 1}.</span>
                  <span className="font-semibold text-gray-800">{step.label}:</span>
                  <span className="text-gray-600">{step.formula}</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Earnings and Deductions */}
      {(sectionVisible('earnings') || sectionVisible('deductions')) && (
        <div className="border-t border-gray-300 pt-4 mb-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Earnings Column */}
            {sectionVisible('earnings') && (
              <div>
                <h3 className="font-bold mb-2 text-center border-b border-gray-400 pb-1">
                  {template?.sections.find((s) => s.key === 'earnings')?.title || 'Earnings'}
                </h3>
                <div className="space-y-2 text-sm">
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
                <h3 className="font-bold mb-2 text-center border-b border-gray-400 pb-1">
                  {template?.sections.find((s) => s.key === 'deductions')?.title || 'Deductions'}
                </h3>
                <div className="space-y-2 text-sm">
                  {deductionsFields ? (
                    deductionsFields.map((f) => {
                      let value = 0;
                      switch (f.key) {
                        case 'epf':             value = slip.salaryBreakup?.epf ?? 0; break;
                        case 'esi':             value = slip.salaryBreakup?.esi ?? 0; break;
                        case 'professionalTax': value = slip.salaryBreakup?.professionalTax ?? 0; break;
                        case 'tds':             value = slip.salaryBreakup?.tds ?? 0; break;
                        case 'loanRecovery':    value = slip.salaryBreakup?.loanRecovery ?? 0; break;
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
      <div className="bg-gray-200 p-4 rounded mb-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Net Salary</span>
          <span className="text-xl font-bold">{formatCurrency(slip.salaryBreakup.netSalary)}</span>
        </div>
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="text-xs text-gray-600 italic mt-8 pt-4 border-t border-gray-300">
          {footerNoteText}
        </div>
      )}

      {/* Slip Number */}
      {showSlipNo && (
        <div className="text-xs text-gray-500 mt-4">
          Slip No: {slip.slipNumber}
        </div>
      )}
    </div>
  );
}
