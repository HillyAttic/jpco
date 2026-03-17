import { isFuture, isToday, startOfMonth } from 'date-fns';
import { Client } from '@/services/client.service';
import { ClientTaskCompletion } from '@/services/task-completion.service';
import { RecurringTask } from '@/services/recurring-task.service';

export interface MonthData {
  key: string;       // "YYYY-MM"
  monthName: string; // "Jan"
  year: string;
  fullDate: Date;
}

export function generateMonths(recurrencePattern: string): MonthData[] {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Start from current month
  const startYear = currentYear;
  const startMonth = currentMonth;

  // End at 5 years forward
  const endYear = currentYear + 5;
  const endMonth = 11; // December

  // Generate all months from current month to end
  const allMonths: MonthData[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const firstMonth = (year === startYear) ? startMonth : 0;
    const lastMonth = (year === endYear) ? endMonth : 11;

    for (let month = firstMonth; month <= lastMonth; month++) {
      const date = new Date(year, month, 1);
      allMonths.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        monthName: date.toLocaleDateString('en-US', { month: 'short' }),
        year: year.toString(),
        fullDate: date,
      });
    }
  }

  // Filter based on recurrence pattern
  switch (recurrencePattern) {
    case 'monthly':
      return allMonths; // Show all months
    case 'quarterly':
      return allMonths.filter((_, index) => index % 3 === 0);
    case 'half-yearly':
      return allMonths.filter((_, index) => index % 6 === 0);
    case 'yearly':
      return allMonths.filter((_, index) => index % 12 === 0);
    default:
      return allMonths;
  }
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

export function calculateCompletionRate(
  task: RecurringTask,
  clientCount: number,
  taskCompletions: ClientTaskCompletion[]
): number {
  if (clientCount === 0) return 0;

  const months = generateMonths(task.recurrencePattern);
  const totalExpected = clientCount * months.filter(m => !isFuture(m.fullDate) || isToday(startOfMonth(m.fullDate))).length;

  if (totalExpected === 0) return 0;

  const completed = taskCompletions.filter(c => c.isCompleted).length;
  return Math.round((completed / totalExpected) * 100);
}
