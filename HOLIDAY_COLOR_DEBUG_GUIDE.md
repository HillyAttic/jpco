# Holiday Color Not Showing - Debug Guide

## Problem
Holidays added through "Manage Holidays" are not appearing in blue on the attendance roster. They show as gray (pending status) instead.

## Enhanced Debugging Added

I've added comprehensive console logging to help diagnose the issue. Follow these steps:

### Step 1: Open Browser Console
1. Open the attendance roster page
2. Press F12 to open Developer Tools
3. Go to the Console tab
4. Clear the console (click the 🚫 icon)

### Step 2: Refresh the Page
Click the "Refresh" button on the attendance roster page and watch the console output.

### Step 3: Check Console Messages

You should see these messages in order:

#### A. Total Holidays Check
```
[AttendanceRoster] Total holidays in database: X
```
- If this shows 0, your holidays weren't saved properly
- If this shows 2 or more, the holidays exist in the database

#### B. Holiday Details
```
[AttendanceRoster] Holiday in DB: {
  id: "...",
  name: "grace1",
  date: Timestamp {...},
  dateType: "object",
  isTimestamp: true
}
```
- Check if `dateType` is "object" (good) or "string" (bad)
- Check if `isTimestamp` is true (good) or false (bad)
- If `dateType` is "string", you need to delete and re-add the holidays

#### C. Date Range
```
[AttendanceRoster] Date range: {
  startDate: "2026-02-01T00:00:00.000Z",
  endDate: "2026-02-28T23:59:59.999Z",
  month: 1,
  year: 2026
}
```
- Verify the month is correct (1 = February, 0 = January)
- Verify the year is 2026
- Verify the date range includes Feb 20 and 21

#### D. Fetched Holidays Count
```
[AttendanceRoster] Fetched holidays for month: X
```
- If this shows 0, the query isn't finding your holidays
- If this shows 2, the holidays are being fetched

#### E. Processing Each Holiday
```
[AttendanceRoster] Processing holiday: {
  id: "...",
  name: "grace1",
  rawDate: Timestamp {...}
}
[AttendanceRoster] Parsed Timestamp: "2026-02-20T00:00:00.000Z"
[AttendanceRoster] Adding holiday to Set: 2026-02-20 grace1
```
- Check if the parsed date matches your expected date
- Check if the formatted date is correct (YYYY-MM-DD)

#### F. Final Holidays Set
```
[AttendanceRoster] Final holidays Set: ["2026-02-20", "2026-02-21"]
```
- This shows all holidays that will be checked
- Verify your dates are in this array

#### G. Date Checking
```
[AttendanceRoster] Checking day 20: {
  dateStr: "2026-02-20",
  isSunday: false,
  isHoliday: true,
  holidaysSet: ["2026-02-20", "2026-02-21"],
  hasMatch: true
}
```
- Check if `isHoliday` is true
- Check if `hasMatch` is true
- If both are true, the date should show as blue

## Common Issues and Solutions

### Issue 1: Total holidays in database is 0
**Problem**: Holidays weren't saved to Firestore

**Solution**:
1. Click "Manage Holidays"
2. Add your holidays again
3. Verify they appear in the list
4. Close the modal
5. Refresh the page

### Issue 2: dateType is "string" instead of "object"
**Problem**: Holidays were saved in old string format

**Solution**:
1. Click "Manage Holidays"
2. Delete the existing holidays
3. Re-add them (they'll be saved as Timestamps)
4. Close the modal
5. Refresh the page

### Issue 3: Fetched holidays for month is 0
**Problem**: Query isn't finding holidays in the date range

**Possible Causes**:
- Holidays are stored with wrong dates
- Timezone issue causing date mismatch
- Query range doesn't include your dates

**Solution**:
1. Check the "Date range" log to verify the month/year
2. Make sure you're viewing February 2026
3. Check the "Holiday in DB" logs to see the actual stored dates
4. If dates don't match, delete and re-add holidays

### Issue 4: isHoliday is false even though holiday is in Set
**Problem**: Date string comparison is failing

**Possible Causes**:
- Date formatting mismatch
- Timezone conversion issue

**Solution**:
1. Check the "Checking day X" logs
2. Compare `dateStr` with values in `holidaysSet`
3. They should match exactly
4. If they don't match, there's a timezone issue

### Issue 5: isHoliday is true but color is still gray
**Problem**: Status assignment logic issue

**Check**:
1. Look for any errors in the console
2. Check if there are any other conditions overriding the holiday status
3. Verify the `getStatusColor` function is working

## Manual Verification Steps

### Step 1: Check Firestore Console
1. Go to https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database
4. Open the `holidays` collection
5. Check your holiday documents

**What to verify**:
- The `date` field should show as a Timestamp (clock icon)
- The date should be: February 20, 2026 at 12:00:00 AM UTC+0
- NOT as a string like "2026-02-20"

### Step 2: Check Month/Year Selection
1. On the attendance roster page
2. Verify the month dropdown shows "February"
3. Verify the year dropdown shows "2026"

### Step 3: Force Refresh
1. Click the "Refresh" button
2. If still not working, hard refresh: Ctrl+Shift+R
3. If still not working, clear cache and reload

## Expected Console Output (Working Correctly)

```
[AttendanceRoster] Total holidays in database: 2
[AttendanceRoster] Holiday in DB: {id: "abc", name: "grace1", date: Timestamp, dateType: "object", isTimestamp: true}
[AttendanceRoster] Holiday in DB: {id: "def", name: "grace2", date: Timestamp, dateType: "object", isTimestamp: true}
[AttendanceRoster] Date range: {startDate: "2026-02-01...", endDate: "2026-02-28...", month: 1, year: 2026}
[AttendanceRoster] Fetched holidays for month: 2
[AttendanceRoster] Processing holiday: {id: "abc", name: "grace1", rawDate: Timestamp}
[AttendanceRoster] Parsed Timestamp: "2026-02-20T00:00:00.000Z"
[AttendanceRoster] Adding holiday to Set: 2026-02-20 grace1
[AttendanceRoster] Processing holiday: {id: "def", name: "grace2", rawDate: Timestamp}
[AttendanceRoster] Parsed Timestamp: "2026-02-21T00:00:00.000Z"
[AttendanceRoster] Adding holiday to Set: 2026-02-21 grace2
[AttendanceRoster] Final holidays Set: ["2026-02-20", "2026-02-21"]
[AttendanceRoster] Checking day 20: {dateStr: "2026-02-20", isSunday: false, isHoliday: true, ...}
[AttendanceRoster] Checking day 21: {dateStr: "2026-02-21", isSunday: false, isHoliday: true, ...}
```

## Quick Fix Checklist

Try these in order:

1. [ ] Open browser console (F12)
2. [ ] Click "Refresh" button on attendance roster
3. [ ] Check console for "Total holidays in database"
4. [ ] If 0, add holidays again
5. [ ] If > 0, check if dateType is "object"
6. [ ] If "string", delete and re-add holidays
7. [ ] Check "Fetched holidays for month" count
8. [ ] If 0, verify you're viewing February 2026
9. [ ] Check "Checking day 20" and "Checking day 21" logs
10. [ ] Verify isHoliday is true
11. [ ] If still not working, share console output

## Share Console Output

If the issue persists, copy the entire console output and share it. Look for:
- Any red error messages
- The values in the debug logs
- Any unexpected values

---

**Note**: The enhanced debugging will help us identify exactly where the issue is occurring in the data flow.
