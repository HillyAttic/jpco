/**
 * Payroll Admin Service
 * Server-side service using Firebase Admin SDK for payroll operations
 * This bypasses Firestore security rules and should only be used in API routes
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PayrollSettings, EmployeeSalary, SalaryCalculationResult, AttendanceBreakdown, SalaryBreakup, SalarySlipTemplate, DEFAULT_SALARY_SLIP_TEMPLATE } from '@/types/payroll.types';
import * as FormulaFunctions from '@/lib/formula-functions';

export const payrollAdminService = {
  // ============================================================================
  // PAYROLL SETTINGS
  // ============================================================================

  /**
   * Get payroll settings (singleton document)
   */
  async getSettings(): Promise<PayrollSettings | null> {
    try {
      const snapshot = await adminDb.collection('payroll-settings').limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PayrollSettings;
    } catch (error) {
      console.error('[PayrollAdminService] Error getting settings:', error);
      throw error;
    }
  },

  /**
   * Save payroll settings (upsert singleton)
   */
  async saveSettings(settings: Omit<PayrollSettings, 'updatedAt'>): Promise<void> {
    try {
      const existing = await this.getSettings();
      const payload = { ...settings, updatedAt: Timestamp.now() };

      if (existing?.id) {
        await adminDb.collection('payroll-settings').doc(existing.id).update(payload);
      } else {
        await adminDb.collection('payroll-settings').add(payload);
      }
    } catch (error) {
      console.error('[PayrollAdminService] Error saving settings:', error);
      throw error;
    }
  },

  // ============================================================================
  // SALARY CALCULATION
  // ============================================================================

  /**
   * Evaluate a custom salary formula
   * All attendance variables and Excel-like functions are passed to the formula scope.
   */
  evaluateSalaryFormula(
    formula: string,
    variables: {
      grossSalary: number;
      totalDaysInMonth: number;
      basicPercentage: number;
      hraPercentage: number;
      specialPercentage: number;
      allowedPaidLeaves: number;
      includePaidLeavesInPaidDays: boolean;
      present: number;
      wfh: number;
      halfDay: number;
      paidLeave: number;
      lopLeave: number;
      lopDays: number;
      holidays: number;
      approvedLeave: number;
      unapprovedLeave: number;
    }
  ): { breakup: SalaryBreakup; paidDays: number } {
    try {
      const {
        grossSalary,
        totalDaysInMonth,
        basicPercentage,
        hraPercentage,
        specialPercentage,
        allowedPaidLeaves,
        includePaidLeavesInPaidDays,
        present,
        wfh,
        halfDay,
        paidLeave,
        lopLeave,
        lopDays,
        holidays,
        approvedLeave,
        unapprovedLeave,
      } = variables;

      // Make Excel functions available in the formula scope
      const {
        IF, IFS, AND, OR, NOT, IFERROR,
        SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTBLANK, PRODUCT,
        ABS, ROUND, ROUNDUP, ROUNDDOWN, CEILING, FLOOR, MOD, INT, SQRT, POWER, RAND, RANDBETWEEN,
        CONCAT, TEXTJOIN, LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER, PROPER, REPLACE, SUBSTITUTE, FIND, SEARCH, TEXT,
        TODAY, NOW, DATE, YEAR, MONTH, DAY, WEEKDAY, EDATE, DATEDIF, NETWORKDAYS, WORKDAY,
        MEDIAN, MODE, LARGE, SMALL, RANK, PERCENTILE, STDEV, VAR,
        SUMIF, SUMIFS, COUNTIF, COUNTIFS, AVERAGEIF, AVERAGEIFS,
      } = FormulaFunctions;

      // eslint-disable-next-line no-new-func
      const evaluateFn = new Function(
        'grossSalary',
        'totalDaysInMonth',
        'basicPercentage',
        'hraPercentage',
        'specialPercentage',
        'allowedPaidLeaves',
        'includePaidLeavesInPaidDays',
        'present',
        'wfh',
        'halfDay',
        'paidLeave',
        'lopLeave',
        'lopDays',
        'holidays',
        'approvedLeave',
        'unapprovedLeave',
        'IF', 'IFS', 'AND', 'OR', 'NOT', 'IFERROR',
        'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTBLANK', 'PRODUCT',
        'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR', 'MOD', 'INT', 'SQRT', 'POWER', 'RAND', 'RANDBETWEEN',
        'CONCAT', 'TEXTJOIN', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'UPPER', 'LOWER', 'PROPER', 'REPLACE', 'SUBSTITUTE', 'FIND', 'SEARCH', 'TEXT',
        'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE', 'DATEDIF', 'NETWORKDAYS', 'WORKDAY',
        'MEDIAN', 'MODE', 'LARGE', 'SMALL', 'RANK', 'PERCENTILE', 'STDEV', 'VAR',
        'SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS', 'AVERAGEIF', 'AVERAGEIFS',
        formula
      );

      const result = evaluateFn(
        grossSalary,
        totalDaysInMonth,
        basicPercentage,
        hraPercentage,
        specialPercentage,
        allowedPaidLeaves,
        includePaidLeavesInPaidDays,
        present,
        wfh,
        halfDay,
        paidLeave,
        lopLeave,
        lopDays,
        holidays,
        approvedLeave,
        unapprovedLeave,
        IF, IFS, AND, OR, NOT, IFERROR,
        SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, COUNTBLANK, PRODUCT,
        ABS, ROUND, ROUNDUP, ROUNDDOWN, CEILING, FLOOR, MOD, INT, SQRT, POWER, RAND, RANDBETWEEN,
        CONCAT, TEXTJOIN, LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER, PROPER, REPLACE, SUBSTITUTE, FIND, SEARCH, TEXT,
        TODAY, NOW, DATE, YEAR, MONTH, DAY, WEEKDAY, EDATE, DATEDIF, NETWORKDAYS, WORKDAY,
        MEDIAN, MODE, LARGE, SMALL, RANK, PERCENTILE, STDEV, VAR,
        SUMIF, SUMIFS, COUNTIF, COUNTIFS, AVERAGEIF, AVERAGEIFS
      );

      // Validate the result
      if (!result || typeof result !== 'object') {
        throw new Error('Formula must return an object');
      }

      const {
        basic = 0,
        hra = 0,
        special = 0,
        totalDeductions = 0,
        netSalary = 0,
        paidDays = 0,
      } = result;

      // Calculate paidDays from the formula result or fallback
      // Paid Days = baseDays − lopDeduction (free leaves reduce the penalty from absences)
      const baseDays = present + wfh + (halfDay * 0.5);
      const totalLeavesForFormula = approvedLeave + unapprovedLeave;
      const lopDeductionForFormula = Math.max(0, totalLeavesForFormula - allowedPaidLeaves);
      const computedPaidDays = paidDays || (includePaidLeavesInPaidDays && totalLeavesForFormula > 0
        ? Math.max(0, baseDays - lopDeductionForFormula)
        : Math.max(0, baseDays));

      return {
        breakup: {
          basic: Number(basic) || 0,
          hra: Number(hra) || 0,
          special: Number(special) || 0,
          totalDeductions: Number(totalDeductions) || 0,
          netSalary: Number(netSalary) || 0,
        },
        paidDays: computedPaidDays,
      };
    } catch (error) {
      console.error('[PayrollAdminService] Error evaluating formula:', error);
      // Fallback to default calculation
      const { present = 0, wfh = 0, halfDay = 0, paidLeave = 0, lopLeave = 0, approvedLeave = 0, unapprovedLeave = 0, allowedPaidLeaves = 0, includePaidLeavesInPaidDays = false } = variables;
      const fallbackBaseDays = present + wfh + (halfDay * 0.5);
      const fallbackTotalLeaves = approvedLeave + unapprovedLeave;
      const fallbackLopDeduction = Math.max(0, fallbackTotalLeaves - allowedPaidLeaves);
      const fallbackPaidDays = includePaidLeavesInPaidDays && fallbackTotalLeaves > 0
        ? Math.max(0, fallbackBaseDays - fallbackLopDeduction)
        : Math.max(0, fallbackBaseDays);
      const netSalary = variables.grossSalary * (fallbackPaidDays / 26);
      const basic = netSalary * (variables.basicPercentage / 100);
      const hra = netSalary * (variables.hraPercentage / 100);
      const special = netSalary * (variables.specialPercentage / 100);
      const totalDeductions = 0;

      return {
        breakup: {
          basic,
          hra,
          special,
          totalDeductions,
          netSalary,
        },
        paidDays: fallbackPaidDays,
      };
    }
  },

  /**
   * Calculate salary for an employee for a given month/year
   */
  async calculateSalary(
    employeeId: string,
    month: number,
    year: number
  ): Promise<SalaryCalculationResult> {
    try {
      // Get payroll settings
      const settings = await this.getSettings();
      if (!settings) {
        throw new Error('Payroll settings not configured');
      }

      // Get employee data
      const employeeDoc = await adminDb.collection('users').doc(employeeId).get();
      if (!employeeDoc.exists) {
        throw new Error('Employee not found');
      }
      const employee = employeeDoc.data()!;
      const grossSalary = employee.grossSalary || 0;

      // Calculate total days in month
      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

      // Get month start and end timestamps
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month, totalDaysInMonth, 23, 59, 59);

      // Fetch attendance records for the month
      const attendanceSnapshot = await adminDb
        .collection('attendance-records')
        .where('employeeId', '==', employeeId)
        .where('clockIn', '>=', Timestamp.fromDate(monthStart))
        .where('clockIn', '<=', Timestamp.fromDate(monthEnd))
        .get();

      // Fetch approved leave requests (filtered by month in the loop below)
      const leaveSnapshot = await adminDb
        .collection('leave-requests')
        .where('employeeId', '==', employeeId)
        .where('status', '==', 'approved')
        .get();

      // Fetch holidays for the month
      const holidaysSnapshot = await adminDb
        .collection('holidays')
        .get();

      // Build set of holiday dates
      const holidayDates = new Set<string>();
      holidaysSnapshot.forEach((doc) => {
        const holidayDate = doc.data().date;
        if (holidayDate) {
          const d = holidayDate.toDate ? holidayDate.toDate() : new Date(holidayDate);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          holidayDates.add(dateStr);
        }
      });

      // Build set of present dates from attendance
      const presentDates = new Set<string>();
      const wfhDates = new Set<string>(); // If WFH tracking exists
      attendanceSnapshot.forEach((doc) => {
        const record = doc.data();
        if (record.clockIn) {
          const clockIn = record.clockIn.toDate();
          const dateStr = `${clockIn.getFullYear()}-${String(clockIn.getMonth() + 1).padStart(2, '0')}-${String(clockIn.getDate()).padStart(2, '0')}`;
          presentDates.add(dateStr);
        }
      });

      // Build set of approved leave dates (only within this month)
      const leaveDates = new Set<string>();
      leaveSnapshot.forEach((doc) => {
        const leave = doc.data();
        if (leave.startDate && leave.endDate) {
          const start = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
          const end = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            // Only include dates within the current month
            if (d.getFullYear() === year && d.getMonth() === month) {
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              leaveDates.add(dateStr);
            }
          }
        }
      });

      // Classify each day of the month
      let present = 0;
      let wfh = 0;
      let approvedLeave = 0;
      let unapprovedLeave = 0;
      let halfDay = 0;
      let holiday = 0;

      for (let day = 1; day <= totalDaysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dayOfWeek = date.getDay();

        // Check attendance records FIRST - if employee worked, count as present
        // regardless of whether it's a weekend or holiday
        if (presentDates.has(dateStr)) {
          present++;
          continue;
        }

        // WFH (if applicable)
        if (wfhDates.has(dateStr)) {
          wfh++;
          continue;
        }

        // Approved Leave
        if (leaveDates.has(dateStr)) {
          approvedLeave++;
          continue;
        }

        // Holiday — official holidays from collection
        if (holidayDates.has(dateStr)) {
          holiday++;
          continue;
        }

        // Sunday — treated as a holiday (non-working day), matching calendar behavior
        if (dayOfWeek === 0) {
          holiday++;
          continue;
        }

        // Skip future days — matching attendance overview behavior (future days are 'upcoming', not absent)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date > today) {
          continue;
        }

        // Unapproved absence (LOP)
        unapprovedLeave++;
      }

      // Calculate total leaves and apply free leave allowance
      const totalLeaves = approvedLeave + unapprovedLeave;
      const freeLeaves = Math.min(totalLeaves, settings.allowedPaidLeaves);

      // LOP Days = total absent days (for display transparency)
      // The actual deduction from Paid Days is only the EXCESS beyond allowed leaves
      const lopDays = totalLeaves;
      const lopDeduction = Math.max(0, lopDays - settings.allowedPaidLeaves);

      // ── Salary Formula ─────────────────────────────────────────────
      // All variables are passed to the formula scope.
      // The formula can compute paidDays and return it in the result object.

      // Calculate salary breakup
      let salaryBreakup: SalaryBreakup;
      let computedPaidDays: number;

      if (settings.salaryFormula) {
        // Use custom formula — all variables available in formula scope
        const result = this.evaluateSalaryFormula(
          settings.salaryFormula,
          {
            grossSalary,
            totalDaysInMonth,
            basicPercentage: settings.basicPercentage,
            hraPercentage: settings.hraPercentage,
            specialPercentage: settings.specialPercentage,
            allowedPaidLeaves: settings.allowedPaidLeaves,
            includePaidLeavesInPaidDays: settings.includePaidLeavesInPaidDays ?? false,
            present,
            wfh,
            halfDay,
            paidLeave: freeLeaves,
            lopLeave: lopDeduction,
            lopDays,
            holidays: holiday,
            approvedLeave,
            unapprovedLeave,
          }
        );
        salaryBreakup = result.breakup;
        computedPaidDays = result.paidDays;
      } else {
        // Default: Paid Days = baseDays [− lopDeduction if toggle is ON and employee has taken leave]
        // Free leaves reduce the penalty from absences — they don't add extra paid days on top of present.
        const baseDays = present + wfh + (halfDay * 0.5);
        if (settings.includePaidLeavesInPaidDays && totalLeaves > 0) {
          computedPaidDays = Math.max(0, baseDays - lopDeduction);
        } else {
          computedPaidDays = Math.max(0, baseDays);
        }
        const netSalary = (grossSalary * computedPaidDays) / 26;
        const basic = netSalary * (settings.basicPercentage / 100);
        const hra = netSalary * (settings.hraPercentage / 100);
        const special = netSalary * (settings.specialPercentage / 100);
        const totalDeductions = 0;

        salaryBreakup = {
          basic,
          hra,
          special,
          totalDeductions,
          netSalary,
        };
      }

      const attendanceBreakdown: AttendanceBreakdown = {
        present,
        wfh,
        approvedLeave,
        unapprovedLeave,
        halfDay,
        holiday,
        paidLeave: freeLeaves,
        lopLeave: lopDeduction, // Actual deduction from paid days (excess beyond allowed leaves)
        paidDays: computedPaidDays,
        lopDays, // Total absent days (for display)
      };

      return {
        attendanceBreakdown,
        salaryBreakup,
        totalDaysInMonth,
        paidDays: computedPaidDays,
        lopDays,
      };
    } catch (error) {
      console.error('[PayrollAdminService] Error calculating salary:', error);
      throw error;
    }
  },

  // ============================================================================
  // SALARY SLIP GENERATION
  // ============================================================================

  /**
   * Generate salary slips for multiple employees
   */
  async generateSlips(
    employeeIds: string[],
    month: number,
    year: number,
    generatedBy: string,
    accessMap?: Record<string, boolean>
  ): Promise<EmployeeSalary[]> {
    try {
      const generatedSlips: EmployeeSalary[] = [];
      const skippedEmployees: string[] = [];
      const batchSize = 499;
      let batch = adminDb.batch();
      let batchCount = 0;

      console.log(`[PayrollAdminService] generateSlips called with ${employeeIds.length} employee(s) for month=${month}, year=${year}`);

      for (const employeeId of employeeIds) {
        // Check if slip already exists for this employee/month/year
        const existingSlips = await adminDb
          .collection('salary-slips')
          .where('employeeId', '==', employeeId)
          .where('month', '==', month)
          .where('year', '==', year)
          .limit(1)
          .get();

        if (!existingSlips.empty) {
          console.log(`[PayrollAdminService] Skipping ${employeeId} - slip already exists for ${month}/${year}`);
          skippedEmployees.push(`${employeeId} (already exists)`);
          continue;
        }

        // Get employee data
        const employeeDoc = await adminDb.collection('users').doc(employeeId).get();
        if (!employeeDoc.exists) {
          console.error(`[PayrollAdminService] Employee document NOT FOUND for employeeId=${employeeId} in users collection. This employee will be SKIPPED.`);
          skippedEmployees.push(`${employeeId} (user doc not found)`);
          continue;
        }
        const employee = employeeDoc.data()!;
        console.log(`[PayrollAdminService] Found employee: ${employee.displayName || employee.name}, grossSalary=${employee.grossSalary}`);

        // Calculate salary
        const calculation = await this.calculateSalary(employeeId, month, year);

        // Generate slip number
        const employeeCode = employee.employeeId || employeeId;
        const slipNumber = `SAL-${year}${String(month + 1).padStart(2, '0')}-${employeeCode}`;

        // Build salary slip document
        const slip: Omit<EmployeeSalary, 'id'> = {
          employeeId,
          name: employee.displayName || employee.name || '',
          employeeCode,
          designation: employee.designation || '',
          department: employee.department || '',
          doj: employee.doj || null,
          pan: employee.pan || null,
          grossSalary: employee.grossSalary || 0,
          month,
          year,
          totalDaysInMonth: calculation.totalDaysInMonth,
          paidDays: calculation.paidDays,
          lopDays: calculation.lopDays,
          attendanceBreakdown: calculation.attendanceBreakdown,
          salaryBreakup: calculation.salaryBreakup,
          slipNumber,
          generatedAt: Timestamp.now() as any,
          generatedBy,
          accessGranted: accessMap?.[employeeId] ?? true,
        };

        const slipRef = adminDb.collection('salary-slips').doc();
        batch.set(slipRef, slip);
        batchCount++;

        generatedSlips.push({ id: slipRef.id, ...slip });

        // Commit batch when it reaches the size limit
        if (batchCount === batchSize) {
          await batch.commit();
          batch = adminDb.batch();
          batchCount = 0;
        }
      }

      // Commit remaining slips
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`[PayrollAdminService] Generated ${generatedSlips.length} slip(s). Skipped: ${skippedEmployees.length} (${skippedEmployees.join(', ')})`);

      return generatedSlips;
    } catch (error) {
      console.error('[PayrollAdminService] Error generating slips:', error);
      throw error;
    }
  },

  // ============================================================================
  // SALARY SLIP QUERIES
  // ============================================================================

  /**
   * Get salary slips with optional filters
   */
  async getSlips(filters: {
    employeeId?: string;
    month?: number;
    year?: number;
    accessGranted?: boolean;
  } = {}): Promise<EmployeeSalary[]> {
    try {
      let query: any = adminDb.collection('salary-slips');

      if (filters.employeeId) {
        query = query.where('employeeId', '==', filters.employeeId);
      }
      if (filters.month !== undefined) {
        query = query.where('month', '==', filters.month);
      }
      if (filters.year !== undefined) {
        query = query.where('year', '==', filters.year);
      }
      if (filters.accessGranted !== undefined) {
        query = query.where('accessGranted', '==', filters.accessGranted);
      }

      console.log(`[PayrollAdminService] getSlips filters:`, JSON.stringify(filters));
      const snapshot = await query.get();
      console.log(`[PayrollAdminService] getSlips found ${snapshot.size} document(s)`);
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmployeeSalary[];
    } catch (error) {
      console.error('[PayrollAdminService] Error getting slips:', error);
      throw error;
    }
  },

  /**
   * Get a single salary slip by ID
   */
  async getSlipById(slipId: string): Promise<EmployeeSalary | null> {
    try {
      const doc = await adminDb.collection('salary-slips').doc(slipId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as EmployeeSalary;
    } catch (error) {
      console.error('[PayrollAdminService] Error getting slip by ID:', error);
      return null;
    }
  },

  /**
   * Delete salary slips by IDs
   */
  async deleteSlips(ids: string[]): Promise<void> {
    try {
      const batchSize = 499;
      let batch = adminDb.batch();
      let batchCount = 0;

      for (const id of ids) {
        batch.delete(adminDb.collection('salary-slips').doc(id));
        batchCount++;

        if (batchCount === batchSize) {
          await batch.commit();
          batch = adminDb.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (error) {
      console.error('[PayrollAdminService] Error deleting slips:', error);
      throw error;
    }
  },

  /**
   * Update an existing salary slip (admin edits)
   */
  async updateSlip(
    slipId: string,
    data: Partial<
      Omit<
        EmployeeSalary,
        'id' | 'employeeId' | 'month' | 'year' | 'generatedAt' | 'generatedBy' | 'slipNumber' | 'employeeCode'
      >
    >
  ): Promise<boolean> {
    try {
      await adminDb.collection('salary-slips').doc(slipId).update(data as any);
      return true;
    } catch (error) {
      console.error('[PayrollAdminService] Error updating slip:', error);
      throw error;
    }
  },

  // ============================================================================
  // SALARY SLIP TEMPLATE CRUD
  // ============================================================================

  /**
   * Get all salary slip templates
   */
  async getTemplates(): Promise<SalarySlipTemplate[]> {
    try {
      const snapshot = await adminDb.collection('salary-slip-templates').get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalarySlipTemplate[];
    } catch (error) {
      console.error('[PayrollAdminService] Error getting templates:', error);
      throw error;
    }
  },

  /**
   * Get a single salary slip template by ID
   */
  async getTemplateById(templateId: string): Promise<SalarySlipTemplate | null> {
    try {
      const doc = await adminDb.collection('salary-slip-templates').doc(templateId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as SalarySlipTemplate;
    } catch (error) {
      console.error('[PayrollAdminService] Error getting template:', error);
      return null;
    }
  },

  /**
   * Create a new salary slip template
   */
  async createTemplate(
    template: Omit<SalarySlipTemplate, 'id' | 'updatedAt'>
  ): Promise<SalarySlipTemplate> {
    try {
      const payload = { ...template, updatedAt: Timestamp.now() };
      const ref = await adminDb.collection('salary-slip-templates').add(payload);
      return { id: ref.id, ...payload } as SalarySlipTemplate;
    } catch (error) {
      console.error('[PayrollAdminService] Error creating template:', error);
      throw error;
    }
  },

  /**
   * Update an existing salary slip template
   */
  async updateTemplate(
    templateId: string,
    template: Partial<Omit<SalarySlipTemplate, 'id' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const payload = { ...template, updatedAt: Timestamp.now() };
      await adminDb.collection('salary-slip-templates').doc(templateId).update(payload);
      return true;
    } catch (error) {
      console.error('[PayrollAdminService] Error updating template:', error);
      throw error;
    }
  },

  /**
   * Delete a salary slip template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      await adminDb.collection('salary-slip-templates').doc(templateId).delete();
      return true;
    } catch (error) {
      console.error('[PayrollAdminService] Error deleting template:', error);
      throw error;
    }
  },

  /**
   * Get or create the default template if none exist.
   * Returns the first template, or seeds one from DEFAULT_SALARY_SLIP_TEMPLATE.
   */
  async getActiveTemplate(): Promise<SalarySlipTemplate | null> {
    try {
      const snapshot = await adminDb
        .collection('salary-slip-templates')
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as SalarySlipTemplate;
      }

      // Seed the default template
      const seeded = await this.createTemplate(DEFAULT_SALARY_SLIP_TEMPLATE);
      return seeded;
    } catch (error) {
      console.error('[PayrollAdminService] Error getting active template:', error);
      throw error;
    }
  },
};
