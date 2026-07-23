/**
 * FormulaEditor - Simple Table-Based Salary Formula Editor
 * Admin can directly type/edit formula expressions with quick-insert chips
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { payrollService } from '@/services/payroll.service';
import { PayrollSettings } from '@/types/payroll.types';
import { FormulaAutocomplete, SUGGESTION_LIBRARY } from './FormulaAutocomplete';
import {
  Save,
  RotateCcw,
  Trash2,
  FunctionSquare,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Sigma,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormulaLine {
  key: string;
  label: string;
  description: string;
  expression: string;
}

interface FormulaEditorProps {
  settings: PayrollSettings | null;
  onSaveSuccess?: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LINE_KEYS = [
  // Input variables (from attendance/employee data)
  'grossSalary',
  'totalDaysInMonth',
  'basicPercentage',
  'hraPercentage',
  'specialPercentage',
  'allowedPaidLeaves',
  'present',
  'wfh',
  'halfDay',
  'paidLeave',
  'leaveTaken',
  'unpaidLeave',
  'holidays',
  'approvedLeave',
  'unapprovedLeave',
  // Calculated components
  'totalWorkingDays',
  'paidDays',
  'proratedGross',
  'basic',
  'hra',
  'special',
  'totalDeductions',
  'netSalary',
] as const;

const LINE_META: Record<string, { label: string; description: string }> = {
  // Input variables
  grossSalary: { label: 'Gross Salary', description: "Employee's monthly gross salary" },
  totalDaysInMonth: { label: 'Total Days', description: 'Total days in the month' },
  basicPercentage: { label: 'Basic %', description: 'Basic salary percentage from settings' },
  hraPercentage: { label: 'HRA %', description: 'HRA percentage from settings' },
  specialPercentage: { label: 'Special %', description: 'Special allowance percentage from settings' },
  allowedPaidLeaves: { label: 'Allowed Paid Leaves', description: 'Free paid leaves per month from settings' },
  present: { label: 'Present', description: 'Days present in office' },
  wfh: { label: 'WFH', description: 'Work from home days' },
  halfDay: { label: 'Half Day', description: 'Half-day attendance count' },
  paidLeave: { label: 'Paid Leave', description: 'Allowed paid leaves per month' },
  leaveTaken: { label: 'Leave Taken', description: 'Total leaves taken (approved + unapproved + absent)' },
  unpaidLeave: { label: 'Unpaid Leave', description: 'Leave taken minus allowed paid leaves' },
  holidays: { label: 'Holidays', description: 'Number of holidays in the month' },
  approvedLeave: { label: 'Approved Leave', description: 'Approved leave days taken' },
  unapprovedLeave: { label: 'Unapproved Leave', description: 'Unapproved leave days taken' },
  // Calculated components
  totalWorkingDays: { label: 'Total Working Days', description: 'Total days minus holidays' },
  paidDays: { label: 'Paid Days', description: 'Total paid days for the month' },
  proratedGross: { label: 'Prorated Gross Salary', description: 'Gross salary adjusted for attendance' },
  basic: { label: 'Basic Salary', description: 'Basic wage component' },
  hra: { label: 'HRA', description: 'House Rent Allowance' },
  special: { label: 'Special Allowance', description: 'Special allowance component' },
  totalDeductions: { label: 'Total Deductions', description: 'PF, PT, TDS, etc.' },
  netSalary: { label: 'Net Salary', description: 'Final take-home salary' },
};

// Variables that are passed directly from the system (self-referencing defaults)
const INPUT_VARIABLES = new Set([
  'grossSalary',
  'totalDaysInMonth',
  'basicPercentage',
  'hraPercentage',
  'specialPercentage',
  'allowedPaidLeaves',
  'present',
  'wfh',
  'halfDay',
  'paidLeave',
  'leaveTaken',
  'unpaidLeave',
  'holidays',
  'approvedLeave',
  'unapprovedLeave',
]);

const VARIABLES = [
  { value: 'grossSalary', label: 'Gross Salary', desc: "Employee's monthly gross salary" },
  { value: 'totalDaysInMonth', label: 'Total Days', desc: 'Total days in the month' },
  { value: 'basicPercentage', label: 'Basic %', desc: 'Basic salary percentage from settings' },
  { value: 'hraPercentage', label: 'HRA %', desc: 'HRA percentage from settings' },
  { value: 'specialPercentage', label: 'Special %', desc: 'Special allowance percentage from settings' },
  { value: 'allowedPaidLeaves', label: 'Allowed Leaves', desc: 'Free paid leaves per month from settings' },
  { value: 'present', label: 'Present', desc: 'Days present in office' },
  { value: 'wfh', label: 'WFH', desc: 'Work from home days' },
  { value: 'halfDay', label: 'Half Day', desc: 'Half-day attendance count' },
  { value: 'paidLeave', label: 'Paid Leave', desc: 'Allowed paid leaves per month' },
  { value: 'leaveTaken', label: 'Leave Taken', desc: 'Total leaves (approved + unapproved)' },
  { value: 'unpaidLeave', label: 'Unpaid Leave', desc: 'Excess leave beyond allowed paid leaves' },
  { value: 'holidays', label: 'Holidays', desc: 'Number of holidays in the month' },
  { value: 'approvedLeave', label: 'Approved Leave', desc: 'Approved leave days taken' },
  { value: 'unapprovedLeave', label: 'Unapproved Leave', desc: 'Unapproved leave days taken' },
];

const COMPONENTS = [
  { value: 'totalWorkingDays', label: 'Total Working Days' },
  { value: 'paidDays', label: 'Paid Days' },
  { value: 'proratedGross', label: 'Prorated Gross' },
  { value: 'basic', label: 'Basic' },
  { value: 'hra', label: 'HRA' },
  { value: 'special', label: 'Special' },
  { value: 'totalDeductions', label: 'Deductions' },
  { value: 'netSalary', label: 'Net Salary' },
];

const OPERATORS = ['+', '-', '*', '/'];
const BRACKETS = ['(', ')'];

const DEFAULT_EXPRESSIONS: Record<string, string> = {
  // Input variables - self-referencing (use value as-is)
  grossSalary: 'grossSalary',
  totalDaysInMonth: 'totalDaysInMonth',
  basicPercentage: 'basicPercentage',
  hraPercentage: 'hraPercentage',
  specialPercentage: 'specialPercentage',
  allowedPaidLeaves: 'allowedPaidLeaves',
  present: 'present',
  wfh: 'wfh',
  halfDay: 'halfDay',
  paidLeave: 'MIN(approvedLeave + unapprovedLeave, allowedPaidLeaves)',
  leaveTaken: 'approvedLeave + unapprovedLeave',
  unpaidLeave: 'MAX(0, approvedLeave + unapprovedLeave - allowedPaidLeaves)',
  holidays: 'holidays',
  approvedLeave: 'approvedLeave',
  unapprovedLeave: 'totalWorkingDays - present - wfh - holidays - approvedLeave - (halfDay * 0.5)',
  // Calculated components
  totalWorkingDays: 'totalDaysInMonth - holidays',
  paidDays: 'totalWorkingDays - unpaidLeave',
  proratedGross: 'grossSalary * (paidDays / totalWorkingDays)',
  basic: 'proratedGross * (basicPercentage / 100)',
  hra: 'proratedGross * (hraPercentage / 100)',
  special: 'proratedGross * (specialPercentage / 100)',
  totalDeductions: '0',
  netSalary: 'basic + hra + special - totalDeductions',
};

// ── Parser: extract expressions from saved formula string ─────────────────────

function parseFormulaToExpressions(formulaString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lineRegex = /const\s+(\w+)\s*=\s*(.+?);/g;
  let match;

  while ((match = lineRegex.exec(formulaString)) !== null) {
    const key = match[1];
    const expression = match[2].trim();

    if (LINE_KEYS.includes(key as typeof LINE_KEYS[number])) {
      result[key] = expression;
    }
  }

  return result;
}

// ── Code Generator: expressions → JavaScript formula string ───────────────────

function generateFormulaString(expressions: Record<string, string>): string {
  const lines: string[] = [];

  LINE_KEYS.forEach((key) => {
    const expr = expressions[key] || '';
    // Skip self-referencing (input variables that use their value as-is)
    if (expr === key) return;
    lines.push(`const ${key} = ${expr};`);
  });

  lines.push('return { paidDays, basic, hra, special, totalDeductions, netSalary };');
  return lines.join('\n');
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FormulaEditor({ settings, onSaveSuccess }: FormulaEditorProps) {
  const [expressions, setExpressions] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [focusedLineKey, setFocusedLineKey] = useState<string | null>(null);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [ghostText, setGhostText] = useState('');
  const [ghostTextStart, setGhostTextStart] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Ghost Text Computation ──────────────────────────────────────────────────

  /** Compute inline ghost text suggestion for a given expression value */
  const computeGhostText = useCallback((value: string): { text: string; start: number } | null => {
    const match = value.match(/(?:^|[\s+\-*/(,])([A-Za-z]{1,})\s*$/);
    if (!match || match[1].length < 2) return null;
    const query = match[1].toUpperCase();
    const matches = SUGGESTION_LIBRARY.filter((item) =>
      item.name.toUpperCase().startsWith(query)
    );
    if (matches.length === 0) return null;
    // If the typed text exactly matches a suggestion, don't show ghost
    if (matches.some((m) => m.name === match[1])) return null;
    return {
      text: matches[0].name.slice(match[1].length),
      start: match.index! + match[1].length,
    };
  }, []);

  // Initialize expressions from settings or defaults
  useEffect(() => {
    if (isInitialized) return;

    if (settings?.salaryFormula) {
      const parsed = parseFormulaToExpressions(settings.salaryFormula);
      const merged: Record<string, string> = {};
      LINE_KEYS.forEach((key) => {
        merged[key] = parsed[key] ?? DEFAULT_EXPRESSIONS[key] ?? '';
      });
      setExpressions(merged);
    } else {
      setExpressions({ ...DEFAULT_EXPRESSIONS });
    }

    setIsInitialized(true);
  }, [settings, isInitialized]);

  // ── Expression Actions ──────────────────────────────────────────────────────

  const updateExpression = useCallback((key: string, value: string) => {
    setExpressions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const insertToken = useCallback(
    (lineKey: string, token: string) => {
      setExpressions((prev) => {
        const current = prev[lineKey] || '';
        // Add a space before the token if the expression doesn't end with space or operator or bracket
        const needsSpace =
          current.length > 0 &&
          !current.endsWith(' ') &&
          !current.endsWith('(') &&
          !current.endsWith('+') &&
          !current.endsWith('-') &&
          !current.endsWith('*') &&
          !current.endsWith('/');
        const newExpression = current + (needsSpace ? ' ' : '') + token;
        return { ...prev, [lineKey]: newExpression };
      });

      // Refocus the input for the line
      setTimeout(() => {
        inputRefs.current[lineKey]?.focus();
      }, 0);
    },
    []
  );

  const clearExpression = useCallback((key: string) => {
    setExpressions((prev) => ({ ...prev, [key]: '' }));
  }, []);

  const resetToDefault = useCallback(() => {
    setExpressions({ ...DEFAULT_EXPRESSIONS });
    toast.info('Formulas reset to default');
  }, []);

  const clearAll = useCallback(() => {
    const empty: Record<string, string> = {};
    LINE_KEYS.forEach((key) => {
      empty[key] = '';
    });
    setExpressions(empty);
    toast.info('All formulas cleared');
  }, []);

  // ── Autocomplete Keyboard Handlers ──────────────────────────────────────────

  const handleAutocompleteNavigate = useCallback((delta: number) => {
    setAutocompleteIndex((prev) => prev + delta);
  }, []);

  const handleAutocompleteConfirm = useCallback((index: number) => {
    setAutocompleteIndex(index);
  }, []);

  const handleAutocompleteDismiss = useCallback(() => {
    setShowAutocomplete(false);
    setGhostText('');
    setGhostTextStart(0);
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const emptyLines = LINE_KEYS.filter((key) => !expressions[key]?.trim());
    if (emptyLines.length > 0) {
      toast.error(
        `Formula incomplete: ${emptyLines.map((k) => LINE_META[k].label).join(', ')} ${emptyLines.length === 1 ? 'has' : 'have'} no expression`
      );
      return;
    }

    if (!settings) {
      toast.error('Please save payroll settings first');
      return;
    }

    setIsLoading(true);
    try {
      const formulaString = generateFormulaString(expressions);
      const updatedSettings = { ...settings, salaryFormula: formulaString };
      const { id, updatedAt, ...settingsToSave } = updatedSettings;
      const success = await payrollService.saveSettings(settingsToSave);

      if (success) {
        toast.success('Formula saved successfully!');
        onSaveSuccess?.();
      } else {
        toast.error('Failed to save formula');
      }
    } catch (error) {
      toast.error('Failed to save formula');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };


  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FunctionSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Salary Formula Editor
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Type or edit formula expressions directly. Use quick-insert chips to add variables and components.
          </p>
        </div>
      </div>

      {/* Reference Panel (collapsible) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowReference(!showReference)}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick-Insert Reference
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {showReference ? 'Click variables/components to insert them into the focused field' : 'Click to expand'}
            </span>
          </div>
          {showReference ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showReference && (
          <div className="px-5 py-4 space-y-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Variables */}
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2">
                Variables — Input values
              </p>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => focusedLineKey && insertToken(focusedLineKey, v.value)}
                    title={v.desc}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-indigo-50 text-indigo-700 border border-indigo-200
                      hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-sm
                      dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/50
                      transition-all cursor-pointer"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Components */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
                Components — Calculated values
              </p>
              <div className="flex flex-wrap gap-2">
                {COMPONENTS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => focusedLineKey && insertToken(focusedLineKey, c.value)}
                    title={`Reference the ${c.label} value`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-emerald-50 text-emerald-700 border border-emerald-200
                      hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm
                      dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50
                      transition-all cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operators */}
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">
                Operators & Brackets
              </p>
              <div className="flex flex-wrap gap-2">
                {OPERATORS.map((op) => (
                  <button
                    key={op}
                    onClick={() => focusedLineKey && insertToken(focusedLineKey, op)}
                    className="w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center
                      bg-amber-50 text-amber-700 border border-amber-200
                      hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm
                      dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/50
                      transition-all cursor-pointer"
                  >
                    {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op}
                  </button>
                ))}
                {BRACKETS.map((b) => (
                  <button
                    key={b}
                    onClick={() => focusedLineKey && insertToken(focusedLineKey, b)}
                    className="w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center
                      bg-violet-50 text-violet-700 border border-violet-200
                      hover:bg-violet-100 hover:border-violet-300 hover:shadow-sm
                      dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 dark:hover:bg-violet-900/50
                      transition-all cursor-pointer"
                  >
                    {b}
                  </button>
                ))}
                <button
                  onClick={() => focusedLineKey && insertToken(focusedLineKey, '100')}
                  className="px-4 h-9 rounded-lg text-xs font-medium
                    bg-slate-50 text-slate-700 border border-slate-200
                    hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm
                    dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800/50
                    transition-all cursor-pointer"
                >
                  100
                </button>
                <button
                  onClick={() => focusedLineKey && insertToken(focusedLineKey, '0')}
                  className="px-4 h-9 rounded-lg text-xs font-medium
                    bg-slate-50 text-slate-700 border border-slate-200
                    hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm
                    dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800/50
                    transition-all cursor-pointer"
                >
                  0
                </button>
              </div>
            </div>

            {/* Functions */}
            <div>
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">
                Functions — Excel-like formulas
              </p>
              <div className="space-y-3">
                {/* Logical Functions */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Logical</p>
                  <div className="flex flex-wrap gap-2">
                    {['IF', 'IFS', 'AND', 'OR', 'NOT', 'IFERROR'].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => focusedLineKey && insertToken(focusedLineKey, fn + '(')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium
                          bg-purple-50 text-purple-700 border border-purple-200
                          hover:bg-purple-100 hover:border-purple-300
                          dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800
                          transition-all cursor-pointer"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>

                {/* Math Functions */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Math</p>
                  <div className="flex flex-wrap gap-2">
                    {['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'PRODUCT', 'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR', 'MOD', 'INT', 'SQRT', 'POWER', 'RAND', 'RANDBETWEEN'].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => focusedLineKey && insertToken(focusedLineKey, fn + '(')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium
                          bg-purple-50 text-purple-700 border border-purple-200
                          hover:bg-purple-100 hover:border-purple-300
                          dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800
                          transition-all cursor-pointer"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Functions */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Text</p>
                  <div className="flex flex-wrap gap-2">
                    {['CONCAT', 'TEXTJOIN', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'UPPER', 'LOWER', 'PROPER', 'REPLACE', 'SUBSTITUTE', 'FIND', 'SEARCH', 'TEXT'].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => focusedLineKey && insertToken(focusedLineKey, fn + '(')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium
                          bg-purple-50 text-purple-700 border border-purple-200
                          hover:bg-purple-100 hover:border-purple-300
                          dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800
                          transition-all cursor-pointer"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Functions */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Date</p>
                  <div className="flex flex-wrap gap-2">
                    {['TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE', 'DATEDIF', 'NETWORKDAYS', 'WORKDAY'].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => focusedLineKey && insertToken(focusedLineKey, fn + '(')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium
                          bg-purple-50 text-purple-700 border border-purple-200
                          hover:bg-purple-100 hover:border-purple-300
                          dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800
                          transition-all cursor-pointer"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statistical Functions */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Statistical</p>
                  <div className="flex flex-wrap gap-2">
                    {['MEDIAN', 'MODE', 'LARGE', 'SMALL', 'RANK', 'PERCENTILE', 'STDEV', 'VAR'].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => focusedLineKey && insertToken(focusedLineKey, fn + '(')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium
                          bg-purple-50 text-purple-700 border border-purple-200
                          hover:bg-purple-100 hover:border-purple-300
                          dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800
                          transition-all cursor-pointer"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Functions */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Conditional</p>
                  <div className="flex flex-wrap gap-2">
                    {['SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS', 'AVERAGEIF', 'AVERAGEIFS'].map((fn) => (
                      <button
                        key={fn}
                        onClick={() => focusedLineKey && insertToken(focusedLineKey, fn + '(')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium
                          bg-purple-50 text-purple-700 border border-purple-200
                          hover:bg-purple-100 hover:border-purple-300
                          dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800
                          transition-all cursor-pointer"
                      >
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formula Lines Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
        <table className="w-full table-fixed min-w-[700px]">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[70%]" />
            <col className="w-[80px]" />
          </colgroup>
          <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                Expression
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
            {LINE_KEYS.map((key) => {
              const meta = LINE_META[key];
              const expr = expressions[key] || '';
              const isFocused = focusedLineKey === key;

              // Compute current suggestions for this expression (for dropdown & keyboard)
              const partialMatch = expr.match(/(?:^|[\s+\-*/(,])([A-Za-z]{1,})\s*$/);
              const currentSuggestions = partialMatch && partialMatch[1].length >= 2
                ? SUGGESTION_LIBRARY.filter((item) =>
                    item.name.toUpperCase().startsWith(partialMatch[1].toUpperCase())
                  )
                : [];
              const showDropdown = showAutocomplete && currentSuggestions.length > 1 && focusedLineKey === key;

              return (
                <tr
                  key={key}
                  className={`transition-colors ${
                    isFocused
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <td className="px-4 py-3 align-middle border-r border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {meta.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {meta.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-0 py-0 align-middle border-r border-gray-200 dark:border-gray-700">
                    <div className="flex items-center h-full relative">
                      <div className="flex items-center gap-2 w-full px-3">
                        <span className="text-sm font-mono font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                          {key} =
                        </span>
                        {/* Ghost text overlay container */}
                        <div className="relative flex-1">
                          {/* Ghost text — rendered behind the input */}
                          {ghostText && focusedLineKey === key && (
                            <span
                              className="absolute top-0 left-0 font-mono text-sm py-3 px-0 pointer-events-none whitespace-pre text-gray-400 dark:text-gray-500 select-none"
                              aria-hidden="true"
                            >
                              <span className="invisible">{expr}</span>
                              <span>{ghostText}</span>
                            </span>
                          )}
                          <input
                            ref={(el) => { inputRefs.current[key] = el; }}
                            type="text"
                            value={expr}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              updateExpression(key, newValue);
                              setShowAutocomplete(true);
                              const ghost = computeGhostText(newValue);
                              if (ghost) {
                                setGhostText(ghost.text);
                                setGhostTextStart(ghost.start);
                              } else {
                                setGhostText('');
                                setGhostTextStart(0);
                              }
                            }}
                            onFocus={() => {
                              setFocusedLineKey(key);
                              setShowAutocomplete(true);
                              const ghost = computeGhostText(expr);
                              if (ghost) {
                                setGhostText(ghost.text);
                                setGhostTextStart(ghost.start);
                              } else {
                                setGhostText('');
                                setGhostTextStart(0);
                              }
                            }}
                            onBlur={() => {
                              setGhostText('');
                              setGhostTextStart(0);
                            }}
                            onKeyDown={(e) => {
                              // Tab or Right Arrow at end of input → accept ghost text
                              if (ghostText && (e.key === 'Tab' || (e.key === 'ArrowRight' && e.currentTarget.selectionStart === expr.length))) {
                                e.preventDefault();
                                const firstMatch = currentSuggestions[0];
                                if (firstMatch && partialMatch) {
                                  const query = partialMatch[1];
                                  const prefix = expr.slice(0, expr.length - query.length);
                                  const suffix = firstMatch.type === 'function' ? '(' : '';
                                  const newValue = prefix + firstMatch.name + suffix;
                                  updateExpression(key, newValue);
                                  setGhostText('');
                                  setGhostTextStart(0);
                                }
                                return;
                              }

                              // Enter → accept ghost text (same as Tab)
                              if (ghostText && e.key === 'Enter') {
                                e.preventDefault();
                                const firstMatch = currentSuggestions[0];
                                if (firstMatch && partialMatch) {
                                  const query = partialMatch[1];
                                  const prefix = expr.slice(0, expr.length - query.length);
                                  const suffix = firstMatch.type === 'function' ? '(' : '';
                                  const newValue = prefix + firstMatch.name + suffix;
                                  updateExpression(key, newValue);
                                  setGhostText('');
                                  setGhostTextStart(0);
                                }
                                return;
                              }

                              // Escape → dismiss ghost text
                              if (ghostText && e.key === 'Escape') {
                                e.preventDefault();
                                setGhostText('');
                                setGhostTextStart(0);
                                return;
                              }

                              // ArrowDown/ArrowUp → navigate dropdown suggestions
                              if (showDropdown) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setAutocompleteIndex((prev) => prev + 1);
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setAutocompleteIndex((prev) => Math.max(0, prev - 1));
                                }
                              }
                            }}
                            placeholder={`Enter expression for ${meta.label.toLowerCase()}...`}
                            className="relative bg-transparent border-0 focus:outline-none focus:ring-0 font-mono text-sm py-3 px-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white w-full"
                            spellCheck={false}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      {/* Compact dropdown for multiple matches */}
                      {showDropdown && (
                        <FormulaAutocomplete
                          value={expr}
                          onSelect={(functionText) => {
                            const match = expr.match(/(?:^|[\s+\-*/(,])([A-Za-z]{1,})\s*$/);
                            if (match) {
                              const query = match[1];
                              const prefix = expr.slice(0, expr.length - query.length);
                              updateExpression(key, prefix + functionText);
                            } else {
                              updateExpression(key, expr + functionText);
                            }
                            setGhostText('');
                            setGhostTextStart(0);
                            setShowAutocomplete(false);
                            setTimeout(() => inputRefs.current[key]?.focus(), 0);
                          }}
                          inputRef={inputRefs.current[key] as React.RefObject<HTMLInputElement | null> | null}
                          selectedIndex={autocompleteIndex}
                          onNavigate={handleAutocompleteNavigate}
                          onConfirm={handleAutocompleteConfirm}
                          onDismiss={handleAutocompleteDismiss}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 align-middle text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearExpression(key)}
                      disabled={!expr}
                      className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                      title="Clear expression"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button onClick={handleSave} disabled={isLoading} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Formula'}
        </Button>
        <Button variant="outline" onClick={resetToDefault} disabled={isLoading} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Default
        </Button>
        <Button variant="destructive" onClick={clearAll} disabled={isLoading} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
