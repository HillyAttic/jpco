# Holiday Display Issue - Diagnostic Guide

## Problem
Holidays "grace1" (Feb 20, 2026) and "grace2" (Feb 21, 2026) were added through the Manage Holidays dialog but are not appearing in blue on the attendance roster.

## Step-by-Step Diagnosis

### Step 1: Check Browser Console
Open your browser's Developer Tools (F12) and look for these messages:

**Expected Messages:**
```
[AttendanceRoster] Fetched holidays: 2
[AttendanceRoster] Adding holiday: 2026-02-20 grace1
[AttendanceRoster] Adding holiday: 2026-02-21 grace2
[AttendanceRoster] Date is holiday: 2026-02-20
[AttendanceRoster] Date is holiday: 2026-02-21
```

**What Each Message Means:**
- `Fetched holidays: 2` → Successfully retrieved 2 holidays from Firestore
- `Adding holiday: 2026-02-20 grace1` → Holiday was added to the Set
- `Date is holiday: 2026-02-20` → Date was recognized as a holiday when building the roster

### Step 2: Check What You See

**If you see "Fetched holidays: 0":**
- The query isn't finding your holidays
- Possible causes:
  1. Holidays are stored in old string format (not Timestamp)
  2. Date range query is incorrect
  3. Firestore security rules are blocking access

**If you see "Fetched holidays: 2" but no "Adding holiday" messages:**
- The date conversion is failing
- Check if the date field in Firestore is a Timestamp or string

**If you see "Adding holiday" but no "Date is holiday" messages:**
- The date comparison is failing
- Date format mismatch between stored and compared dates

### Step 3: Verify Firestore Data

1. Open Firebase Console: https://console.firebase.google.com
2. Navigate to Firestore Database
3. Open the `holidays` collection
4. Check your holiday documents

**What to Look For:**

For "grace1" document:
```
date: February 20, 2026 at 12:00:00 AM UTC+0  (should be a Timestamp, not a string)
name: "grace1"
description: ""
createdAt: [Timestamp]
```

**CRITICAL**: The `date` field should show as a **Timestamp** with a clock icon, NOT as a string.

**If it shows as a string like "2026-02-20":**
- This is the problem!
- The old code saved it as a string
- The new code expects a Timestamp
- Solution: Delete and re-add the holiday

### Step 4: Check Current Month/Year Selection

Make sure you're viewing the correct month:
- Month selector should show: **February**
- Year selector should show: **2026**

If you're viewing a different month, the holidays won't appear because they're outside the date range.

### Step 5: Force Refresh

Try these in order:

1. **Click the "Refresh" button** on the attendance roster page
2. **Hard refresh the browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Close and reopen the Manage Holidays modal**
4. **Clear browser cache** and reload

## Common Issues and Solutions

### Issue 1: Holidays Stored as Strings (Most Likely)

**Symptom**: Console shows "Fetched holidays: 0" or holidays don't match

**Cause**: Holidays were added before the Timestamp fix was implemented

**Solution**: Delete and re-add the holidays

**Steps:**
1. Click "Manage Holidays"
2. Delete "grace1" and "grace2"
3. Add them again:
   - Date: 2026-02-20, Name: grace1
   - Date: 2026-02-21, Name: grace2
4. Close the modal
5. Check if they now appear in blue

### Issue 2: Timezone Mismatch

**Symptom**: Console shows holidays are added but dates don't match

**Cause**: Timezone conversion issues

**Solution**: The fix already handles this, but verify:
- Check console logs for the exact date strings
- They should match: "2026-02-20" and "2026-02-21"

### Issue 3: Cache Issue

**Symptom**: Everything looks correct but holidays don't show

**Solution**: 
1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Reload the page

### Issue 4: Security Rules

**Symptom**: Console shows Firestore permission errors

**Solution**: Security rules were already deployed, but verify:
```bash
firebase deploy --only firestore:rules
```

## Testing Script

Run this in your browser console to diagnose:

```javascript
// Test 1: Check if holidays collection is accessible
const testHolidays = async () => {
  const { db } = await import('/src/lib/firebase.js');
  const { collection, getDocs } = await import('firebase/firestore');
  
  const snapshot = await getDocs(collection(db, 'holidays'));
  console.log('Total holidays in database:', snapshot.size);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('Holiday:', {
      id: doc.id,
      name: data.name,
      date: data.date,
      dateType: typeof data.date,
      isTimestamp: data.date && typeof data.date.toDate === 'function'
    });
  });
};

testHolidays();
```

**Expected Output:**
```
Total holidays in database: 2
Holiday: {
  id: "abc123",
  name: "grace1",
  date: Timestamp { seconds: 1740009600, nanoseconds: 0 },
  dateType: "object",
  isTimestamp: true
}
Holiday: {
  id: "def456",
  name: "grace2",
  date: Timestamp { seconds: 1740096000, nanoseconds: 0 },
  dateType: "object",
  isTimestamp: true
}
```

**If you see `dateType: "string"` or `isTimestamp: false`:**
- This confirms the holidays are in the wrong format
- Delete and re-add them

## Quick Fix Checklist

Try these in order:

- [ ] Check browser console for debug messages
- [ ] Verify you're viewing February 2026
- [ ] Click the "Refresh" button
- [ ] Open Manage Holidays and verify holidays are listed
- [ ] Check Firestore Console - verify date field is a Timestamp
- [ ] If date is a string, delete and re-add the holidays
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Clear browser cache
- [ ] Check for any console errors

## Expected Behavior After Fix

Once working correctly:

1. **In Manage Holidays Modal:**
   - grace1: Fri, Feb 20, 2026
   - grace2: Sat, Feb 21, 2026

2. **In Attendance Roster:**
   - Column 20 (Feb 20): All cells should be BLUE
   - Column 21 (Feb 21): All cells should be BLUE

3. **In Employee Stats:**
   - H: 2 (or more if there are Sundays)

4. **In Browser Console:**
   ```
   [AttendanceRoster] Fetched holidays: 2
   [AttendanceRoster] Adding holiday: 2026-02-20 grace1
   [AttendanceRoster] Adding holiday: 2026-02-21 grace2
   [AttendanceRoster] Date is holiday: 2026-02-20
   [AttendanceRoster] Date is holiday: 2026-02-21
   ```

## Still Not Working?

If you've tried everything above and holidays still don't show:

1. **Take a screenshot of:**
   - The Manage Holidays modal showing your holidays
   - The attendance roster page
   - The browser console with debug messages
   - The Firestore console showing the holiday document

2. **Check for errors:**
   - Any red errors in the console?
   - Any Firestore permission errors?
   - Any network errors in the Network tab?

3. **Verify the code changes were applied:**
   - Check if the file was saved
   - Check if the dev server reloaded
   - Try stopping and restarting the dev server

## Manual Database Fix (Advanced)

If you need to manually fix the date format in Firestore:

1. Open Firebase Console
2. Go to Firestore Database
3. Find the `holidays` collection
4. For each holiday document:
   - Click the document
   - Click the `date` field
   - Change type from "string" to "timestamp"
   - Enter the date: 2026-02-20 00:00:00
   - Save

This manually converts string dates to Timestamps.

---

**Note**: The most common issue is that holidays were added before the Timestamp fix. Simply deleting and re-adding them should resolve the issue.
