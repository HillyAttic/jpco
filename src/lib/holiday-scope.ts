/**
 * Holiday scoping.
 *
 * A holiday applies either to everyone (legacy records with no `scope` field,
 * or an explicit `scope: 'global'`) or to one manager's team
 * (`scope: 'manager'`, `createdBy` = that manager's uid).
 *
 * The team is resolved from `manager-hierarchies` at read time rather than
 * copied onto the holiday, so moving an employee to a different manager also
 * moves which holidays apply to them.
 *
 * Holidays created before scoping existed have no `scope`, so they stay global
 * and past payroll months recompute exactly as they did before.
 */

import { adminDb } from '@/lib/firebase-admin';

export interface ScopedHoliday {
  scope?: string | null;
  createdBy?: string | null;
}

/**
 * managerId -> employeeIds, from the manager-hierarchies collection.
 *
 * ponytail: reads the whole collection rather than the handful of managers who
 * created the holidays in play. Fine while the collection is small; switch to a
 * `where('managerId', 'in', [...])` lookup (max 30 ids per query) if it grows.
 */
export async function getManagerTeams(): Promise<Map<string, string[]>> {
  const snapshot = await adminDb.collection('manager-hierarchies').get();
  const teams = new Map<string, string[]>();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.managerId) {
      teams.set(data.managerId, (data.employeeIds as string[]) || []);
    }
  });
  return teams;
}

/** The employees a holiday applies to, or 'all' when it is not team-scoped. */
export function holidayAppliesTo(
  holiday: ScopedHoliday,
  teams: Map<string, string[]>
): 'all' | string[] {
  if (holiday.scope !== 'manager') return 'all';
  return teams.get(holiday.createdBy || '') || [];
}

/** Whether a holiday belongs in this user's holiday list. */
export function holidayVisibleTo(
  holiday: ScopedHoliday,
  userId: string,
  role: string,
  teams: Map<string, string[]>
): boolean {
  if (role === 'admin') return true;
  const appliesTo = holidayAppliesTo(holiday, teams);
  if (appliesTo === 'all') return true;
  // The manager who created it, or one of their team members
  return holiday.createdBy === userId || appliesTo.includes(userId);
}
