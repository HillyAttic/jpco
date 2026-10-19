/**
 * computeTaskCompletionRate — the rate the reports summary row shows for tasks
 * that track client-month completions (no enabled report types). It must match
 * the per-member rate the team-member modal shows for the same task/period.
 *
 * Uses a past FY so every scheduled month has started and the result does not
 * depend on the date the suite runs.
 */

import { computeTaskCompletionRate } from '@/utils/report-utils';
import type { RecurringTask } from '@/services/recurring-task.service';
import type { ClientTaskCompletion } from '@/services/task-completion.service';

// FY 2025-26, quarterly anchored on October (dueMonth 9) → Apr/Jul/Oct 2025 + Jan 2026
const task = {
  recurrencePattern: 'quarterly',
  dueDate: new Date(2025, 9, 15),
  teamMemberMappings: [{ userId: 'u1', userName: 'Poonam', clientIds: ['c1', 'c2', 'c3', 'c4', 'c5'] }],
  contactIds: [],
} as unknown as RecurringTask;

const completion = (clientId: string, monthKey: string): ClientTaskCompletion =>
  ({ clientId, monthKey, isCompleted: true } as ClientTaskCompletion);

describe('computeTaskCompletionRate', () => {
  it('counts completed client-months against clients × started months', () => {
    // 5 clients × 4 started quarters = 20 expected, 1 done → 5%
    expect(computeTaskCompletionRate(task, [completion('c1', '2025-04')], '2025-26')).toBe(5);
  });

  it('ignores completions for clients outside the task and months outside the schedule', () => {
    const completions = [
      completion('c1', '2025-07'),
      completion('not-in-task', '2025-07'), // unassigned client
      completion('c2', '2025-06'), // June is not a scheduled quarter
      { ...completion('c3', '2025-10'), isCompleted: false }, // not marked done
    ];
    expect(computeTaskCompletionRate(task, completions, '2025-26')).toBe(5);
  });

  it('narrows to a single selected month', () => {
    // July only: 5 clients × 1 month = 5 expected, 1 done → 20%
    expect(computeTaskCompletionRate(task, [completion('c1', '2025-07')], '2025-26', 'Jul')).toBe(20);
  });

  it('returns 0 when the task has no clients', () => {
    const empty = { ...task, teamMemberMappings: [], contactIds: [] } as unknown as RecurringTask;
    expect(computeTaskCompletionRate(empty, [completion('c1', '2025-04')], '2025-26')).toBe(0);
  });
});
