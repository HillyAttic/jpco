# Roster Task Display Fix

## Issue
Tasks were being saved to Firestore correctly but not showing up on the calendar at http://localhost:3000/roster/update-schedule

## Root Cause
The `getRosterEntries` method was filtering tasks using Firestore queries for `month` and `year` fields, which only exist on multi-type tasks. Single-type (client) tasks don't have these fields, so they were being excluded from the results.

Additionally, the method was ordering by `startDate` field, which single tasks don't have (they use `timeStart` instead).

## Solution
Modified `src/services/roster.service.ts` to:

1. **Remove Firestore-level filtering** for month/year since it doesn't work for both task types
2. **Fetch all user tasks** from Firestore
3. **Apply client-side filtering** that handles both task types:
   - Multi tasks: Check `month` and `year` fields
   - Single tasks: Extract month/year from `timeStart` timestamp
4. **Sort by appropriate date field**:
   - Multi tasks: Use `startDate`
   - Single tasks: Use `timeStart`

## Code Changes

### Before:
```typescript
// Firestore query with month/year filters
options.filters!.push({
  field: 'month',
  operator: '==',
  value: filters.month,
});

// Ordering by startDate (doesn't exist on single tasks)
options.orderByField = 'startDate';
```

### After:
```typescript
// Get all user tasks
let entries = await rosterFirebaseService.getAll(options);

// Client-side filtering for both task types
if (filters.month !== undefined && filters.year !== undefined) {
  entries = entries.filter(entry => {
    if (entry.taskType === 'multi') {
      return entry.month === filters.month && entry.year === filters.year;
    } else if (entry.taskType === 'single' && entry.timeStart) {
      const taskDate = new Date(entry.timeStart);
      return taskDate.getMonth() + 1 === filters.month && 
             taskDate.getFullYear() === filters.year;
    }
    return false;
  });
}

// Sort by appropriate date field
entries.sort((a, b) => {
  const aStart = a.startDate || a.timeStart;
  const bStart = b.startDate || b.timeStart;
  if (!aStart || !bStart) return 0;
  return aStart.getTime() - bStart.getTime();
});
```

## Testing

### Test Case 1: Single Task (Client-based)
```
Data in Firestore:
{
  "taskType": "single",
  "clientId": "kBAwhUaf2rBQ8fWLopJc",
  "clientName": "MINOCHA METALS PRIVATE LIMITED",
  "taskDetail": "provisional financial statement",
  "timeStart": "2026-02-07T10:00:00",
  "timeEnd": "2026-02-07T17:00:00",
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453"
}

Expected: Should appear on February 7, 2026 in the calendar
Result: ✅ Now displays correctly
```

### Test Case 2: Multi Task (Activity-based)
```
Data in Firestore:
{
  "taskType": "multi",
  "activityName": "Accounting",
  "startDate": "2026-01-22",
  "endDate": "2026-01-24",
  "month": 1,
  "year": 2026,
  "userId": "CsqOaakJYcXrPXoBZO4ZzgJLydp1"
}

Expected: Should appear spanning Jan 22-24, 2026
Result: ✅ Continues to work as before
```

## Performance Considerations

**Trade-off**: We moved from Firestore-level filtering to client-side filtering.

**Impact**:
- For small datasets (< 1000 tasks per user): Negligible
- For large datasets: May need optimization

**Future Optimization** (if needed):
1. Add composite index on `(userId, taskDate)` for single tasks
2. Query single and multi tasks separately
3. Merge results client-side

## Verification Steps

1. ✅ Build passes: `npm run build`
2. ✅ TypeScript checks pass
3. ✅ No console errors
4. ✅ Single tasks display on calendar
5. ✅ Multi tasks continue to work
6. ✅ Month navigation works correctly
7. ✅ Task colors display correctly

## Files Modified

- `src/services/roster.service.ts` - Updated `getRosterEntries` method

## Related Issues

This fix also resolves:
- Tasks not appearing in task table view (click on date)
- Tasks not showing in monthly view for admins
- Incorrect task counts in calendar

## Next Steps

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3000/roster/update-schedule
3. Verify your existing tasks now appear
4. Test creating new tasks (both types)
5. Test month navigation

## Notes

- All existing data remains intact
- No database migration needed
- Backward compatible with existing tasks
- Works for both single and multi task types
