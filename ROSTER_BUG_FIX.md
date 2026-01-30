# Roster System - Bug Fix: Activities Not Showing in View Schedule

## Issue Description
Activities created by users in the Update Schedule page were not appearing in the View Schedule page for Admin/Manager.

## Root Cause
The original implementation had a fundamental flaw in how it filtered roster entries:

1. **Storage**: When saving an activity, it stored `month` and `year` based on the **start date** only
2. **Retrieval**: When viewing the roster, it filtered by `month` and `year` fields
3. **Problem**: Activities that:
   - Span across multiple months (e.g., Jan 28 - Feb 5)
   - Were viewed in a different month than their start month
   - Had start dates in one month but were being viewed in another month
   
   ...would not appear in the roster view.

## Example Scenario
```
User creates activity:
- Activity: "Project Audit"
- Start Date: January 28, 2026
- End Date: February 5, 2026
- Stored with: month=1, year=2026

Admin views February 2026 roster:
- Query filters: month=2, year=2026
- Result: Activity NOT shown (because month field = 1)
```

## Solution Implemented

### 1. Updated `getMonthlyRosterView` Function
Changed from filtering by `month` and `year` fields to using **date range overlap detection**:

```typescript
// OLD (Incorrect)
let entries = await this.getRosterEntries({ month, year });

// NEW (Correct)
const startOfMonth = new Date(year, month - 1, 1);
const endOfMonth = new Date(year, month, 0);

// Get all entries and filter by date overlap
entries = entries.filter(entry => {
  const entryStart = new Date(entry.startDate);
  const entryEnd = new Date(entry.endDate);
  return entryStart <= endOfMonth && entryEnd >= startOfMonth;
});
```

### 2. Updated `getUserCalendarEvents` Function
Applied the same date range overlap logic for consistency in the user's personal calendar view.

### 3. Smart Day Clamping
When an activity spans multiple months, the display now correctly clamps the start/end days to the current month:

```typescript
// Clamp the dates to the current month
const displayStart = entryStart < startOfMonth ? startOfMonth : entryStart;
const displayEnd = entryEnd > endOfMonth ? endOfMonth : entryEnd;

// Use clamped dates for display
startDay: displayStart.getDate(),
endDay: displayEnd.getDate(),
```

## How It Works Now

### Date Overlap Logic
An activity is shown in a month if it overlaps with that month:
```
Activity overlaps with month IF:
  activityStartDate <= monthEndDate AND activityEndDate >= monthStartDate
```

### Examples

**Example 1: Activity Spanning Two Months**
```
Activity: Jan 28 - Feb 5
- January view: Shows days 28-31
- February view: Shows days 1-5
```

**Example 2: Activity Within One Month**
```
Activity: Jan 10 - Jan 15
- January view: Shows days 10-15
- February view: Not shown (no overlap)
```

**Example 3: Activity Spanning Three Months**
```
Activity: Jan 25 - Mar 5
- January view: Shows days 25-31
- February view: Shows days 1-29 (or 28)
- March view: Shows days 1-5
```

## Benefits

1. ✅ **Accurate Display**: All activities are now shown in the correct months
2. ✅ **Cross-Month Support**: Activities spanning multiple months display correctly
3. ✅ **Consistent Behavior**: Both user calendar and admin roster use the same logic
4. ✅ **No Data Migration Needed**: The fix works with existing data
5. ✅ **Better User Experience**: Users see complete schedules regardless of date ranges

## Testing Checklist

- [x] Create activity within single month → Shows correctly
- [x] Create activity spanning two months → Shows in both months
- [x] Create activity spanning three months → Shows in all three months
- [x] View as regular user → Personal calendar shows all activities
- [x] View as admin/manager → Excel roster shows all users' activities
- [x] Navigate between months → Activities appear/disappear correctly
- [x] Edit activity dates → Updates reflected immediately
- [x] Delete activity → Removed from all relevant months

## Files Modified

1. **src/services/roster.service.ts**
   - Updated `getMonthlyRosterView()` function
   - Updated `getUserCalendarEvents()` function

## Migration Notes

**No database migration required!** The fix works with existing data because:
- We still store `month` and `year` fields (for potential future use)
- But we now query based on actual date ranges instead
- Existing entries will automatically display correctly

## Performance Considerations

The new implementation:
- Fetches all roster entries (no month filter)
- Filters in memory using date comparison
- This is acceptable because:
  - Roster entries are typically not huge in volume
  - Date filtering is very fast
  - Firestore queries are optimized
  - Results are cached on the client

For very large datasets (1000+ entries), consider:
- Adding pagination
- Implementing server-side date range filtering
- Using Firestore composite indexes on date fields

## Conclusion

The roster system now correctly displays all activities in their relevant months, providing accurate schedule visibility for both users and administrators.

---

**Fixed Date**: January 30, 2026
**Status**: ✅ Resolved
**Impact**: High - Core functionality fix
