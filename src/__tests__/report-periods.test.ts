import {
  applyRecurrenceFilter,
  generateDisplayMonths,
  getCurrentPeriod,
  getFinancialYear,
} from '@/utils/report-utils';

const keys = (months: { key: string }[]) => months.map(m => m.key);

describe('getCurrentPeriod', () => {
  it('uses the calendar month for monthly tasks', () => {
    expect(getCurrentPeriod('monthly', undefined, new Date(2026, 9, 13)).key).toBe('2026-10');
  });

  it('snaps to the task phase for quarterly tasks', () => {
    // due month October -> Apr/Jul/Oct/Jan
    expect(getCurrentPeriod('quarterly', 9, new Date(2026, 9, 13)).key).toBe('2026-10');
    // due month January also gives Apr/Jul/Oct/Jan, so Oct is current until Jan arrives
    expect(getCurrentPeriod('quarterly', 0, new Date(2026, 11, 20)).key).toBe('2026-10');
    expect(getCurrentPeriod('quarterly', 0, new Date(2027, 0, 5)).key).toBe('2027-01');
    // due month March -> Mar/Jun/Sep/Dec, so October is never a period for this task
    expect(getCurrentPeriod('quarterly', 2, new Date(2026, 9, 13)).key).toBe('2026-09');
  });

  it('handles half-yearly and yearly phases', () => {
    expect(getCurrentPeriod('half-yearly', 9, new Date(2026, 9, 13)).key).toBe('2026-10');
    expect(getCurrentPeriod('half-yearly', 9, new Date(2026, 11, 20)).key).toBe('2026-10');
    expect(getCurrentPeriod('half-yearly', 9, new Date(2027, 3, 1)).key).toBe('2027-04');
    expect(getCurrentPeriod('yearly', 9, new Date(2026, 9, 13)).key).toBe('2026-10');
    // before this year's due month arrives the previous cycle is still the current one
    expect(getCurrentPeriod('yearly', 9, new Date(2026, 8, 1)).key).toBe('2025-10');
  });
});

describe('writer / reader period agreement', () => {
  const patterns = ['monthly', 'quarterly', 'half-yearly', 'yearly'];
  const dueMonths = [undefined, 0, 1, 2, 3, 6, 9, 11];
  const refDates = [
    new Date(2026, 9, 13),
    new Date(2026, 3, 1),
    new Date(2027, 0, 5),
    new Date(2027, 1, 20),
  ];

  // The property that broke: whatever period the writer keys a completion by must be a
  // column the report actually renders, otherwise the tick is silently invisible.
  it.each(patterns.flatMap(p => dueMonths.map(d => [p, d] as const)))(
    '%s / dueMonth %s: current period is one of the report columns',
    (pattern, dueMonth) => {
      for (const ref of refDates) {
        const period = getCurrentPeriod(pattern, dueMonth, ref);
        const fy = getFinancialYear(period.fullDate);
        const columns = new Set(keys(generateDisplayMonths(fy, pattern, 'all', dueMonth)));
        expect(columns.has(period.key)).toBe(true);
      }
    }
  );
});

describe('TDS Return Filing regressions', () => {
  it('with dueDate in October, October is a report column and is current', () => {
    const ref = new Date(2026, 9, 13); // 13 Oct 2026
    const columns = keys(generateDisplayMonths('2026-27', 'quarterly', 'all', 9));
    expect(columns).toEqual(['2026-04', '2026-07', '2026-10', '2027-01']);
    expect(columns).toContain(getCurrentPeriod('quarterly', 9, ref).key);
  });

  it('with a stale March anchor, a calendar-month key can never appear', () => {
    const columns = keys(generateDisplayMonths('2026-27', 'quarterly', 'all', 2));
    expect(columns).toEqual(['2026-06', '2026-09', '2026-12', '2027-03']);
    // this is the original bug: the writer saved "2026-10", which is not in that set
    expect(columns).not.toContain('2026-10');
    // the writer now snaps onto the task's own schedule instead
    expect(getCurrentPeriod('quarterly', 2, new Date(2026, 9, 13)).key).toBe('2026-09');
  });
});

describe('applyRecurrenceFilter', () => {
  const months = Array.from({ length: 12 }, (_, i) => ({
    key: `2026-${String(i + 1).padStart(2, '0')}`,
    monthName: '',
    year: '2026',
    fullDate: new Date(2026, i, 1),
  }));

  it('treats an unparseable dueMonth as unanchored rather than matching nothing', () => {
    // an Invalid Date dueDate yields NaN from getMonth()
    expect(applyRecurrenceFilter(months, 'quarterly', NaN).length).toBeGreaterThan(0);
  });

  it('returns every month for monthly tasks regardless of dueMonth', () => {
    expect(applyRecurrenceFilter(months, 'monthly', 5)).toHaveLength(12);
  });
});
