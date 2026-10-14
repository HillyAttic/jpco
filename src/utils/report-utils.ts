import { isFuture, isToday, startOfMonth } from 'date-fns';
import { Client } from '@/services/client.service';
import { ClientTaskCompletion } from '@/services/task-completion.service';

export interface MonthData {
  key: string;       // "YYYY-MM"
  monthName: string; // "Jan"
  year: string;
  fullDate: Date;
}

/** Indian financial year label (Apr → Mar) containing `date`, e.g. "2026-27". */
export function getFinancialYear(date: Date): string {
  const fyStart = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

export function buildMonthData(month: number, year: number): MonthData {
  const date = new Date(year, month, 1);
  return {
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    monthName: date.toLocaleDateString('en-US', { month: 'short' }),
    year: year.toString(),
    fullDate: date,
  };
}

const FY_START_MONTH = 3; // April

/**
 * Narrow a month list to the months a task's recurrence actually schedules.
 * `dueMonth` (0-indexed month of the task's due date) anchors the phase, matching how the
 * overdue compliance calendar is laid out. Without one, the schedule is anchored to the
 * financial year (April) so the writer and the reader always agree on the same period.
 */
export function applyRecurrenceFilter(
  months: MonthData[],
  recurrencePattern: string,
  dueMonth?: number
): MonthData[] {
  // A malformed dueDate yields NaN from getMonth(); treat it as unanchored rather than
  // matching nothing at all.
  if (dueMonth !== undefined && Number.isNaN(dueMonth)) dueMonth = undefined;

  const phase = (m: MonthData, cycle: number) => {
    const month = m.fullDate.getMonth();
    const anchor = dueMonth !== undefined ? dueMonth : FY_START_MONTH;
    return month % cycle === anchor % cycle;
  };

  switch (recurrencePattern) {
    case 'quarterly':
      return months.filter(m => phase(m, 3));
    case 'half-yearly':
      return months.filter(m => phase(m, 6));
    case 'yearly':
      // yearly schedules one month, not one month per cycle
      return months.filter(m => m.fullDate.getMonth() === (dueMonth !== undefined ? dueMonth : FY_START_MONTH));
    default:
      return months;
  }
}

/** Scheduled months of one Indian financial year (Apr → Mar). */
export function generateFYMonths(fy: string, recurrencePattern: string, dueMonth?: number): MonthData[] {
  const startYear = parseInt(fy.split('-')[0]);
  return applyRecurrenceFilter(
    [
      ...Array.from({ length: 9 }, (_, i) => buildMonthData(3 + i, startYear)),
      ...Array.from({ length: 3 }, (_, i) => buildMonthData(i, startYear + 1)),
    ],
    recurrencePattern,
    dueMonth
  );
}

/** FY months, optionally narrowed to a single month name. */
export function generateDisplayMonths(
  fy: string,
  recurrencePattern: string,
  selectedMonth?: string,
  dueMonth?: number
): MonthData[] {
  const months = generateFYMonths(fy, recurrencePattern, dueMonth);
  if (selectedMonth && selectedMonth !== 'all') {
    return months.filter(m => m.monthName === selectedMonth);
  }
  return months;
}

/** Every scheduled month from Apr 2025 to 2 years ahead — full history + near future. */
export function generateAllExportMonths(recurrencePattern: string, dueMonth?: number): MonthData[] {
  const endYear = new Date().getFullYear() + 2;
  const all: MonthData[] = [];
  for (let year = 2025; year <= endYear; year++) {
    for (let month = year === 2025 ? 3 : 0; month <= 11; month++) {
      all.push(buildMonthData(month, year));
    }
  }
  return applyRecurrenceFilter(all, recurrencePattern, dueMonth);
}

/**
 * Snap a reference date onto a task's own recurrence schedule — the most recent scheduled
 * period that has already started. Completion records must be keyed by this period, otherwise
 * the reports (which render only scheduled periods) never display them. Falls back to the next
 * scheduled period for tasks whose schedule starts in the future.
 */
export function getCurrentPeriod(
  recurrencePattern: string,
  dueMonth?: number,
  refDate: Date = new Date()
): MonthData {
  const refMonthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const candidates: MonthData[] = [];
  for (let offset = -24; offset <= 24; offset++) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() + offset, 1);
    candidates.push(buildMonthData(d.getMonth(), d.getFullYear()));
  }
  const scheduled = applyRecurrenceFilter(candidates, recurrencePattern, dueMonth);
  const started = scheduled.filter(m => m.fullDate <= refMonthStart);
  return started.length ? started[started.length - 1] : scheduled[0];
}

export function buildCompletionData(
  completions: ClientTaskCompletion[],
  clients: Client[],
  months: MonthData[]
): Map<string, Map<string, boolean>> {
  const data = new Map<string, Map<string, boolean>>();

  // Initialize data structure
  clients.forEach((client) => {
    if (client.id) {
      data.set(client.id, new Map<string, boolean>());
    }
  });

  // Populate with completion data
  completions.forEach((completion) => {
    const clientMap = data.get(completion.clientId);
    if (clientMap && completion.isCompleted) {
      clientMap.set(completion.monthKey, true);
    }
  });

  return data;
}

export interface RemarkInfo {
  remark: string;
  remarkBy: string;
}

export function buildRemarkData(
  completions: ClientTaskCompletion[],
  clients: Client[],
  months: MonthData[]
): Map<string, Map<string, RemarkInfo>> {
  const data = new Map<string, Map<string, RemarkInfo>>();

  clients.forEach((client) => {
    if (client.id) {
      data.set(client.id, new Map<string, RemarkInfo>());
    }
  });

  completions.forEach((completion) => {
    if (completion.remark) {
      const clientMap = data.get(completion.clientId);
      if (clientMap) {
        clientMap.set(completion.monthKey, {
          remark: completion.remark,
          remarkBy: completion.remarkBy || '',
        });
      }
    }
  });

  return data;
}

export function getCompletionStatus(
  completionData: Map<string, Map<string, boolean>>,
  clientId: string,
  monthKey: string,
  monthDate: Date
): 'completed' | 'incomplete' | 'future' {
  const monthStart = startOfMonth(monthDate);

  // Check if the month is in the future
  if (isFuture(monthStart) && !isToday(monthStart)) {
    return 'future';
  }

  // Check completion status
  const clientData = completionData.get(clientId);
  if (clientData && clientData.get(monthKey)) {
    return 'completed';
  }

  return 'incomplete';
}
