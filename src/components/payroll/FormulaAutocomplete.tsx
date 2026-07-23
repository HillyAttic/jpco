/**
 * FormulaAutocomplete - Excel-style autocomplete for formula functions
 * Shows function suggestions as user types with syntax hints
 * Works like Excel: type 2+ chars and matching functions appear instantly
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface SuggestionItem {
  name: string;
  syntax?: string;
  description: string;
  category: string;
  type: 'function' | 'variable' | 'component';
}

const SUGGESTION_LIBRARY: SuggestionItem[] = [
  // Variables — Input values
  { name: 'grossSalary', description: "Employee's monthly gross salary", category: 'Variable', type: 'variable' },
  { name: 'totalDaysInMonth', description: 'Total days in the month', category: 'Variable', type: 'variable' },
  { name: 'basicPercentage', description: 'Basic salary percentage from settings', category: 'Variable', type: 'variable' },
  { name: 'hraPercentage', description: 'HRA percentage from settings', category: 'Variable', type: 'variable' },
  { name: 'specialPercentage', description: 'Special allowance percentage from settings', category: 'Variable', type: 'variable' },
  { name: 'allowedPaidLeaves', description: 'Free paid leaves per month from settings', category: 'Variable', type: 'variable' },
  { name: 'present', description: 'Days present in office', category: 'Variable', type: 'variable' },
  { name: 'wfh', description: 'Work from home days', category: 'Variable', type: 'variable' },
  { name: 'halfDay', description: 'Half-day attendance count', category: 'Variable', type: 'variable' },
  { name: 'paidLeave', description: 'Allowed paid leaves per month from settings', category: 'Variable', type: 'variable' },
  { name: 'leaveTaken', description: 'Total leaves taken (approved + unapproved)', category: 'Variable', type: 'variable' },
  { name: 'unpaidLeave', description: 'Excess leave beyond allowed paid leaves', category: 'Variable', type: 'variable' },
  { name: 'holidays', description: 'Number of holidays in the month', category: 'Variable', type: 'variable' },
  { name: 'approvedLeave', description: 'Approved leave days taken', category: 'Variable', type: 'variable' },
  { name: 'unapprovedLeave', description: 'Unapproved leave days taken', category: 'Variable', type: 'variable' },

  // Components — Calculated values
  { name: 'totalWorkingDays', description: 'Total working days (total days minus holidays)', category: 'Component', type: 'component' },
  { name: 'paidDays', description: 'Total paid days for the month', category: 'Component', type: 'component' },
  { name: 'proratedGross', description: 'Gross salary adjusted for attendance', category: 'Component', type: 'component' },
  { name: 'basic', description: 'Basic wage component', category: 'Component', type: 'component' },
  { name: 'hra', description: 'House Rent Allowance', category: 'Component', type: 'component' },
  { name: 'special', description: 'Special allowance component', category: 'Component', type: 'component' },
  { name: 'totalDeductions', description: 'PF, PT, TDS, etc.', category: 'Component', type: 'component' },
  { name: 'netSalary', description: 'Final take-home salary', category: 'Component', type: 'component' },

  // Functions — Logical
  { name: 'IF', syntax: 'IF(condition, value_if_true, value_if_false)', description: 'Conditional test', category: 'Function', type: 'function' },
  { name: 'IFS', syntax: 'IFS(condition1, value1, [condition2, value2], ...)', description: 'Multiple conditions', category: 'Function', type: 'function' },
  { name: 'AND', syntax: 'AND(condition1, [condition2], ...)', description: 'All conditions true', category: 'Function', type: 'function' },
  { name: 'OR', syntax: 'OR(condition1, [condition2], ...)', description: 'Any condition true', category: 'Function', type: 'function' },
  { name: 'NOT', syntax: 'NOT(condition)', description: 'Reverses TRUE/FALSE', category: 'Function', type: 'function' },
  { name: 'IFERROR', syntax: 'IFERROR(value, value_if_error)', description: 'Handles errors', category: 'Function', type: 'function' },

  // Functions — Math
  { name: 'SUM', syntax: 'SUM(number1, [number2], ...)', description: 'Adds numbers', category: 'Function', type: 'function' },
  { name: 'AVERAGE', syntax: 'AVERAGE(number1, [number2], ...)', description: 'Calculates average', category: 'Function', type: 'function' },
  { name: 'MIN', syntax: 'MIN(number1, [number2], ...)', description: 'Smallest value', category: 'Function', type: 'function' },
  { name: 'MAX', syntax: 'MAX(number1, [number2], ...)', description: 'Largest value', category: 'Function', type: 'function' },
  { name: 'COUNT', syntax: 'COUNT(value1, [value2], ...)', description: 'Counts numbers', category: 'Function', type: 'function' },
  { name: 'COUNTA', syntax: 'COUNTA(value1, [value2], ...)', description: 'Counts non-empty', category: 'Function', type: 'function' },
  { name: 'COUNTBLANK', syntax: 'COUNTBLANK(value1, [value2], ...)', description: 'Counts blank cells', category: 'Function', type: 'function' },
  { name: 'PRODUCT', syntax: 'PRODUCT(number1, [number2], ...)', description: 'Multiplies numbers', category: 'Function', type: 'function' },
  { name: 'ABS', syntax: 'ABS(number)', description: 'Absolute value', category: 'Function', type: 'function' },
  { name: 'ROUND', syntax: 'ROUND(number, num_digits)', description: 'Rounds to decimals', category: 'Function', type: 'function' },
  { name: 'ROUNDUP', syntax: 'ROUNDUP(number, num_digits)', description: 'Rounds up', category: 'Function', type: 'function' },
  { name: 'ROUNDDOWN', syntax: 'ROUNDDOWN(number, num_digits)', description: 'Rounds down', category: 'Function', type: 'function' },
  { name: 'CEILING', syntax: 'CEILING(number, significance)', description: 'Rounds up to multiple', category: 'Function', type: 'function' },
  { name: 'FLOOR', syntax: 'FLOOR(number, significance)', description: 'Rounds down to multiple', category: 'Function', type: 'function' },
  { name: 'MOD', syntax: 'MOD(number, divisor)', description: 'Remainder', category: 'Function', type: 'function' },
  { name: 'INT', syntax: 'INT(number)', description: 'Integer part', category: 'Function', type: 'function' },
  { name: 'SQRT', syntax: 'SQRT(number)', description: 'Square root', category: 'Function', type: 'function' },
  { name: 'POWER', syntax: 'POWER(base, exponent)', description: 'Raises to power', category: 'Function', type: 'function' },
  { name: 'RAND', syntax: 'RAND()', description: 'Random decimal', category: 'Function', type: 'function' },
  { name: 'RANDBETWEEN', syntax: 'RANDBETWEEN(bottom, top)', description: 'Random integer', category: 'Function', type: 'function' },

  // Functions — Text
  { name: 'CONCAT', syntax: 'CONCAT(text1, [text2], ...)', description: 'Combines text', category: 'Function', type: 'function' },
  { name: 'TEXTJOIN', syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, ...)', description: 'Joins with separator', category: 'Function', type: 'function' },
  { name: 'LEFT', syntax: 'LEFT(text, [num_chars])', description: 'First characters', category: 'Function', type: 'function' },
  { name: 'RIGHT', syntax: 'RIGHT(text, [num_chars])', description: 'Last characters', category: 'Function', type: 'function' },
  { name: 'MID', syntax: 'MID(text, start_num, num_chars)', description: 'Extracts text', category: 'Function', type: 'function' },
  { name: 'LEN', syntax: 'LEN(text)', description: 'Length of text', category: 'Function', type: 'function' },
  { name: 'TRIM', syntax: 'TRIM(text)', description: 'Removes extra spaces', category: 'Function', type: 'function' },
  { name: 'UPPER', syntax: 'UPPER(text)', description: 'Uppercase', category: 'Function', type: 'function' },
  { name: 'LOWER', syntax: 'LOWER(text)', description: 'Lowercase', category: 'Function', type: 'function' },
  { name: 'PROPER', syntax: 'PROPER(text)', description: 'Proper case', category: 'Function', type: 'function' },
  { name: 'REPLACE', syntax: 'REPLACE(old_text, start_num, num_chars, new_text)', description: 'Replaces characters', category: 'Function', type: 'function' },
  { name: 'SUBSTITUTE', syntax: 'SUBSTITUTE(text, old_text, new_text, [instance_num])', description: 'Replaces text', category: 'Function', type: 'function' },
  { name: 'FIND', syntax: 'FIND(find_text, within_text, [start_num])', description: 'Finds text (case-sensitive)', category: 'Function', type: 'function' },
  { name: 'SEARCH', syntax: 'SEARCH(find_text, within_text, [start_num])', description: 'Finds text (not case-sensitive)', category: 'Function', type: 'function' },
  { name: 'TEXT', syntax: 'TEXT(value, format_text)', description: 'Formats number as text', category: 'Function', type: 'function' },

  // Functions — Date
  { name: 'TODAY', syntax: 'TODAY()', description: 'Current date', category: 'Function', type: 'function' },
  { name: 'NOW', syntax: 'NOW()', description: 'Current date & time', category: 'Function', type: 'function' },
  { name: 'DATE', syntax: 'DATE(year, month, day)', description: 'Creates a date', category: 'Function', type: 'function' },
  { name: 'YEAR', syntax: 'YEAR(date)', description: 'Extracts year', category: 'Function', type: 'function' },
  { name: 'MONTH', syntax: 'MONTH(date)', description: 'Extracts month', category: 'Function', type: 'function' },
  { name: 'DAY', syntax: 'DAY(date)', description: 'Extracts day', category: 'Function', type: 'function' },
  { name: 'WEEKDAY', syntax: 'WEEKDAY(date, [return_type])', description: 'Day of week', category: 'Function', type: 'function' },
  { name: 'EDATE', syntax: 'EDATE(start_date, months)', description: 'Adds months', category: 'Function', type: 'function' },
  { name: 'DATEDIF', syntax: 'DATEDIF(start_date, end_date, unit)', description: 'Difference in years/months/days', category: 'Function', type: 'function' },
  { name: 'NETWORKDAYS', syntax: 'NETWORKDAYS(start_date, end_date)', description: 'Working days', category: 'Function', type: 'function' },
  { name: 'WORKDAY', syntax: 'WORKDAY(start_date, days)', description: 'Date after working days', category: 'Function', type: 'function' },

  // Functions — Statistical
  { name: 'MEDIAN', syntax: 'MEDIAN(number1, [number2], ...)', description: 'Middle value', category: 'Function', type: 'function' },
  { name: 'MODE', syntax: 'MODE(number1, [number2], ...)', description: 'Most frequent value', category: 'Function', type: 'function' },
  { name: 'LARGE', syntax: 'LARGE(array, k)', description: 'nth largest', category: 'Function', type: 'function' },
  { name: 'SMALL', syntax: 'SMALL(array, k)', description: 'nth smallest', category: 'Function', type: 'function' },
  { name: 'RANK', syntax: 'RANK(number, ref, [order])', description: 'Rank', category: 'Function', type: 'function' },
  { name: 'PERCENTILE', syntax: 'PERCENTILE(array, k)', description: 'Percentile', category: 'Function', type: 'function' },
  { name: 'STDEV', syntax: 'STDEV(number1, [number2], ...)', description: 'Standard deviation', category: 'Function', type: 'function' },
  { name: 'VAR', syntax: 'VAR(number1, [number2], ...)', description: 'Variance', category: 'Function', type: 'function' },

  // Functions — Conditional
  { name: 'SUMIF', syntax: 'SUMIF(range, criteria, [sum_range])', description: 'Conditional sum', category: 'Function', type: 'function' },
  { name: 'SUMIFS', syntax: 'SUMIFS(sum_range, criteria_range1, criteria1, ...)', description: 'Multiple conditions sum', category: 'Function', type: 'function' },
  { name: 'COUNTIF', syntax: 'COUNTIF(range, criteria)', description: 'Conditional count', category: 'Function', type: 'function' },
  { name: 'COUNTIFS', syntax: 'COUNTIFS(criteria_range1, criteria1, ...)', description: 'Multiple conditions count', category: 'Function', type: 'function' },
  { name: 'AVERAGEIF', syntax: 'AVERAGEIF(range, criteria, [average_range])', description: 'Conditional average', category: 'Function', type: 'function' },
  { name: 'AVERAGEIFS', syntax: 'AVERAGEIFS(average_range, criteria_range1, criteria1, ...)', description: 'Multiple conditions average', category: 'Function', type: 'function' },
];

const TYPE_COLORS = {
  variable: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300',
  },
  component: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300',
  },
  function: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300',
  },
};

interface FormulaAutocompleteProps {
  value: string;
  onSelect: (functionText: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null> | null;
  selectedIndex: number;
  onNavigate: (delta: number) => void;
  onConfirm: (index: number) => void;
  onDismiss: () => void;
  forceShow?: boolean;
}

export function FormulaAutocomplete({
  value,
  onSelect,
  inputRef,
  selectedIndex,
  onNavigate,
  onConfirm,
  onDismiss,
  forceShow = false,
}: FormulaAutocompleteProps) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<SuggestionItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine suggestions based on current input value
  const suggestions = useMemo(() => {
    // Find the last "word" being typed (for function name detection)
    // Matches: start of string, or after operator/space/comma/paren
    const match = value.match(/(?:^|[\s+\-*/(,])([A-Za-z]{1,})\s*$/);
    if (!match) return [];
    const query = match[1].toUpperCase();
    // Need at least 2 chars to start suggesting
    if (query.length < 2) return [];
    return SUGGESTION_LIBRARY.filter((item) => item.name.toUpperCase().startsWith(query));
  }, [value]);

  useEffect(() => {
    setVisibleSuggestions(suggestions);
  }, [suggestions]);

  // When forceShow, always display; otherwise only when there are suggestions
  const displaySuggestions = forceShow ? suggestions : visibleSuggestions;
  if (displaySuggestions.length === 0) return null;

  const handleSelect = (item: SuggestionItem) => {
    // Functions get parentheses, variables and components don't
    if (item.type === 'function') {
      onSelect(item.name + '(');
    } else {
      onSelect(item.name);
    }
  };

  const highlightQuery = (name: string): React.ReactNode => {
    const match = value.match(/(?:^|[\s+\-*/(,])([A-Za-z]{1,})\s*$/);
    if (!match) return <>{name}</>;
    const query = match[1].toUpperCase();
    const idx = name.toUpperCase().indexOf(query);
    if (idx === -1) return <>{name}</>;
    return (
      <>
        {name.slice(0, idx)}
        <span className="text-blue-600 dark:text-blue-400 underline font-bold">
          {name.slice(idx, idx + query.length)}
        </span>
        {name.slice(idx + query.length)}
      </>
    );
  };

  const getTypeIcon = (type: SuggestionItem['type']) => {
    switch (type) {
      case 'variable':
        return '';
      case 'component':
        return '🧮';
      case 'function':
        return '⚡';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-full mt-0.5 min-w-[350px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[100] max-h-60 overflow-y-auto"
      role="listbox"
      onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
    >
      <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600 sticky top-0 z-10">
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          More matches ({displaySuggestions.length})
        </p>
      </div>
      {displaySuggestions.map((item, index) => {
        const colors = TYPE_COLORS[item.type];
        return (
          <button
            key={item.name}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            onClick={() => handleSelect(item)}
            className={`w-full text-left px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors cursor-pointer flex items-center gap-2 ${
              index === selectedIndex
                ? `${colors.bg}`
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="text-sm shrink-0">{getTypeIcon(item.type)}</span>
            <span className={`font-mono font-bold text-sm shrink-0 w-28 ${colors.text}`}>
              {highlightQuery(item.name)}
              {item.type === 'function' && (
                <span className="text-gray-400 font-normal">()</span>
              )}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
              {item.description}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${colors.badge}`}>
              {item.category}
            </span>
          </button>
        );
      })}
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 sticky bottom-0">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">↑↓</kbd> navigate
          {' · '}
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">Tab</kbd> or
          {' '}
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">Enter</kbd> select
          {' · '}
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">Esc</kbd> close
        </p>
      </div>
    </div>
  );
}

export { SUGGESTION_LIBRARY };
