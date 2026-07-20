/**
 * SalarySlipPDF Generator
 * Generates PDF salary slips using jspdf + jspdf-autotable
 * Matches the layout of SalarySlipPreview component
 */

import { EmployeeSalary, PayrollSettings } from '@/types/payroll.types';

export async function generateSalarySlipPDF(
  slip: EmployeeSalary,
  settings: PayrollSettings
): Promise<void> {
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  let yPos = 15;

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Company Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addressLines = settings.companyAddress.split('\n');
  addressLines.forEach((line) => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  });
  yPos += 4;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SALARY SLIP', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pay Slip for ${monthNames[slip.month]}, ${slip.year}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Employee Details
  doc.setFontSize(9);
  const employeeDetails = [
    ['Name of the Employee:', slip.name, 'PAN:', slip.pan || '-'],
    ['Employee ID:', slip.employeeCode, 'Department:', slip.department || '-'],
    ['Designation:', slip.designation || '-', 'Date of Joining:', formatDate(slip.doj)],
  ];

  employeeDetails.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], margin, yPos);
    doc.text(row[2], pageWidth / 2, yPos);

    doc.setFont('helvetica', 'normal');
    doc.text(row[1], margin + 40, yPos);
    doc.text(row[3], pageWidth / 2 + 35, yPos);

    yPos += 5;
  });
  yPos += 4;

  // Attendance Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Details', margin, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const attendanceDetails = [
    ['Total Days in Month:', slip.totalDaysInMonth.toString(), 'Paid Days:', slip.paidDays.toString()],
    ['LOP Days:', slip.lopDays.toString(), 'Present:', slip.attendanceBreakdown.present.toString()],
    ['WFH:', slip.attendanceBreakdown.wfh.toString(), 'Holidays:', slip.attendanceBreakdown.holiday.toString()],
    ['Approved Leave:', slip.attendanceBreakdown.approvedLeave.toString(), 'Unapproved Leave:', slip.attendanceBreakdown.unapprovedLeave.toString()],
    ['Half Day:', slip.attendanceBreakdown.halfDay.toString(), '', ''],
  ];

  attendanceDetails.forEach((row) => {
    if (row[0]) {
      doc.setFont('helvetica', 'normal');
      doc.text(row[0], margin, yPos);
      doc.text(row[2] || '', pageWidth / 2, yPos);

      doc.setFont('helvetica', 'bold');
      doc.text(row[1], margin + 40, yPos);
      doc.text(row[3] || '', pageWidth / 2 + 35, yPos);

      yPos += 5;
    }
  });
  yPos += 4;

  // Earnings and Deductions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  // Earnings header
  doc.text('Earnings', margin + 20, yPos, { align: 'center' });
  // Deductions header
  doc.text('Deductions', pageWidth / 2 + 20, yPos, { align: 'center' });

  // Header underline
  doc.setDrawColor(150);
  doc.line(margin, yPos + 1, pageWidth / 2 - 5, yPos + 1);
  doc.line(pageWidth / 2, yPos + 1, pageWidth - margin, yPos + 1);
  yPos += 6;

  // Earnings items
  const earnings = [
    ['Basic Wage', formatCurrency(slip.salaryBreakup.basic)],
    ['HRA', formatCurrency(slip.salaryBreakup.hra)],
    ['Special Allowances', formatCurrency(slip.salaryBreakup.special)],
  ];

  // Deductions items
  const deductions = [
    ['EPF', formatCurrency(0)],
    ['ESI/Health Insurance', formatCurrency(0)],
    ['Professional Tax', formatCurrency(0)],
    ['TDS / Income Tax', formatCurrency(0)],
    ['Loan Recovery', formatCurrency(0)],
    ['Other Deduction', formatCurrency(0)],
  ];

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    if (earnings[i]) {
      doc.text(earnings[i][0], margin, yPos);
      doc.text(earnings[i][1], pageWidth / 2 - 20, yPos, { align: 'right' });
    }
    if (deductions[i]) {
      doc.text(deductions[i][0], pageWidth / 2, yPos);
      doc.text(deductions[i][1], pageWidth - margin - 10, yPos, { align: 'right' });
    }
    yPos += 5;
  }

  // Total row
  yPos += 2;
  doc.setDrawColor(150);
  doc.line(margin, yPos, pageWidth / 2 - 5, yPos);
  doc.line(pageWidth / 2, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Total Earnings', margin, yPos);
  doc.text(formatCurrency(slip.salaryBreakup.basic + slip.salaryBreakup.hra + slip.salaryBreakup.special), pageWidth / 2 - 20, yPos, { align: 'right' });

  doc.text('Total Deductions', pageWidth / 2, yPos);
  doc.text(formatCurrency(slip.salaryBreakup.totalDeductions), pageWidth - margin - 10, yPos, { align: 'right' });
  yPos += 8;

  // Net Salary Box
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('Net Salary', margin + 5, yPos + 8);
  doc.text(formatCurrency(slip.salaryBreakup.netSalary), pageWidth - margin - 5, yPos + 8, { align: 'right' });
  yPos += 20;

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    settings.footerNote || 'This is a computer generated statement, does not require signature.',
    margin,
    yPos
  );
  yPos += 6;

  // Slip Number
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Slip No: ${slip.slipNumber}`, margin, yPos);

  // Save PDF
  doc.save(`SalarySlip_${slip.employeeCode}_${monthNames[slip.month]}_${slip.year}.pdf`);
}
