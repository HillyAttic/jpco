/**
 * Payroll Service
 * Client-side service using authenticatedFetch for payroll operations
 */

import { authenticatedFetch } from '@/lib/api-client';
import { PayrollSettings, EmployeeSalary, SalaryCalculationResult, SalarySlipTemplate } from '@/types/payroll.types';

export const payrollService = {
  /**
   * Get payroll settings
   */
  async getSettings(): Promise<PayrollSettings | null> {
    const response = await authenticatedFetch('/api/payroll/settings');
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Save payroll settings
   */
  async saveSettings(settings: Omit<PayrollSettings, 'updatedAt'>): Promise<boolean> {
    const response = await authenticatedFetch('/api/payroll/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return response.ok;
  },

  /**
   * Calculate salary for an employee (preview)
   */
  async calculateSalary(
    employeeId: string,
    month: number,
    year: number
  ): Promise<SalaryCalculationResult | null> {
    const response = await authenticatedFetch('/api/payroll/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, month, year }),
    });
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Generate salary slips for multiple employees
   */
  async generateSlips(
    employeeIds: string[],
    month: number,
    year: number
  ): Promise<EmployeeSalary[] | null> {
    const response = await authenticatedFetch('/api/payroll/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeIds, month, year }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.slips;
  },

  /**
   * Get salary slips with optional filters
   */
  async getSlips(params: {
    employeeId?: string;
    month?: number;
    year?: number;
    includeAll?: boolean;
  } = {}): Promise<EmployeeSalary[]> {
    const searchParams = new URLSearchParams();
    if (params.employeeId) searchParams.set('employeeId', params.employeeId);
    if (params.month !== undefined) searchParams.set('month', params.month.toString());
    if (params.year !== undefined) searchParams.set('year', params.year.toString());
    if (params.includeAll) searchParams.set('includeAll', 'true');

    const response = await authenticatedFetch(`/api/payroll/slips?${searchParams.toString()}`);
    if (!response.ok) return [];
    return response.json();
  },

  /**
   * Get a single salary slip by ID
   */
  async getSlipById(id: string): Promise<EmployeeSalary | null> {
    const response = await authenticatedFetch(`/api/payroll/slips/${id}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Delete a salary slip
   */
  async deleteSlip(id: string): Promise<boolean> {
    const response = await authenticatedFetch(`/api/payroll/slips/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  },

  /**
   * Update a salary slip (admin edits salary, deductions, attendance, etc.)
   */
  async updateSlip(
    id: string,
    data: Partial<
      Omit<
        EmployeeSalary,
        'id' | 'employeeId' | 'month' | 'year' | 'generatedAt' | 'generatedBy' | 'slipNumber' | 'employeeCode'
      >
    >
  ): Promise<boolean> {
    const response = await authenticatedFetch(`/api/payroll/slips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  },

  // ── Templates ────────────────────────────────────────────────────────────

  /**
   * Get all salary slip templates
   */
  async getTemplates(): Promise<SalarySlipTemplate[]> {
    const response = await authenticatedFetch('/api/payroll/templates');
    if (!response.ok) return [];
    return response.json();
  },

  /**
   * Get a single template by id
   */
  async getTemplateById(id: string): Promise<SalarySlipTemplate | null> {
    const response = await authenticatedFetch(`/api/payroll/templates/${id}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Create a new template
   */
  async createTemplate(
    template: Omit<SalarySlipTemplate, 'id' | 'updatedAt'>
  ): Promise<SalarySlipTemplate | null> {
    const response = await authenticatedFetch('/api/payroll/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Update a template (partial updates supported)
   */
  async updateTemplate(
    id: string,
    template: Partial<Omit<SalarySlipTemplate, 'id' | 'updatedAt'>>
  ): Promise<boolean> {
    const response = await authenticatedFetch(`/api/payroll/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    return response.ok;
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const response = await authenticatedFetch(`/api/payroll/templates/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  },

  // ── Access Config (toggle persistence) ───────────────────────────────────

  /**
   * Save access config for a specific month/year
   * accessConfig format: { "2026-6": { "empId1": true, "empId2": false } }
   */
  async saveAccessConfig(accessConfig: Record<string, Record<string, boolean>>): Promise<boolean> {
    const response = await authenticatedFetch('/api/payroll/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessConfig }),
    });
    return response.ok;
  },

  /**
   * Update accessGranted on a single salary slip
   */
  async updateSlipAccess(slipId: string, accessGranted: boolean): Promise<boolean> {
    const response = await authenticatedFetch(`/api/payroll/slips/${slipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessGranted }),
    });
    return response.ok;
  },

  /**
   * Batch update accessGranted on multiple salary slips
   */
  async batchUpdateSlipAccess(
    updates: Array<{ slipId: string; accessGranted: boolean }>
  ): Promise<boolean> {
    const response = await authenticatedFetch('/api/payroll/slips/batch-access', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    return response.ok;
  },
};
