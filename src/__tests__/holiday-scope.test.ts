jest.mock('@/lib/firebase-admin', () => ({ adminDb: {} }));

import { holidayAppliesTo, holidayVisibleTo, ScopedHoliday } from '@/lib/holiday-scope';

const teams = new Map<string, string[]>([
  ['manager-a', ['emp-1', 'emp-2']],
  ['manager-b', ['emp-3']],
]);

describe('holidayAppliesTo', () => {
  it('treats a holiday with no scope as company-wide (legacy records)', () => {
    expect(holidayAppliesTo({}, teams)).toBe('all');
  });

  it('treats an explicit global holiday as company-wide', () => {
    expect(holidayAppliesTo({ scope: 'global' }, teams)).toBe('all');
  });

  it('resolves a manager holiday to that manager current team', () => {
    expect(holidayAppliesTo({ scope: 'manager', createdBy: 'manager-a' }, teams)).toEqual([
      'emp-1',
      'emp-2',
    ]);
  });

  it('covers nobody when the manager has no hierarchy entry', () => {
    expect(holidayAppliesTo({ scope: 'manager', createdBy: 'ghost' }, teams)).toEqual([]);
  });
});

describe('holidayVisibleTo', () => {
  const globalHoliday: ScopedHoliday = { scope: 'global' };
  const teamHoliday: ScopedHoliday = { scope: 'manager', createdBy: 'manager-a' };

  it('shows admins everything', () => {
    expect(holidayVisibleTo(teamHoliday, 'admin-uid', 'admin', teams)).toBe(true);
  });

  it('shows a team member their own team holiday', () => {
    expect(holidayVisibleTo(teamHoliday, 'emp-1', 'employee', teams)).toBe(true);
  });

  it('hides a team holiday from another team', () => {
    expect(holidayVisibleTo(teamHoliday, 'emp-3', 'employee', teams)).toBe(false);
  });

  it('shows the creating manager their own holiday', () => {
    expect(holidayVisibleTo(teamHoliday, 'manager-a', 'manager', teams)).toBe(true);
  });

  it('hides another manager team holiday', () => {
    expect(holidayVisibleTo(teamHoliday, 'manager-b', 'manager', teams)).toBe(false);
  });

  it('shows company-wide holidays to everyone', () => {
    expect(holidayVisibleTo(globalHoliday, 'emp-3', 'employee', teams)).toBe(true);
  });
});
