# ARN Feature Debugging Guide

## Issue Fixed
The `requiresArn` field was not being saved when creating/updating recurring tasks.

## What Was Fixed

### 1. Recurring Tasks Page (`src/app/tasks/recurring/page.tsx`)
- Added `requiresArn: data.requiresArn || false` to the `taskData` object in `handleSubmit`
- This ensures the ARN requirement is saved to the database

### 2. Added Debug Logging (`src/components/recurring-tasks/RecurringTaskClientModal.tsx`)
- Added console logs to track:
  - When task is loaded in modal
  - Task's `requiresArn` value
  - When toggle completion is called
  - Whether ARN dialog should show

## Testing Steps

### Step 1: Create a New Task with ARN Enabled
1. Go to http://localhost:3000/tasks/recurring
2. Click "Create New Recurring Task"
3. Fill in the form:
   - Title: "Test ARN Task"
   - Description: "Testing ARN feature"
   - Recurrence Pattern: Monthly
   - Start Date: Today
   - Assign some clients
4. **CHECK the "Enable ARN" checkbox** ✅
5. Click "Create Recurring Task"

### Step 2: Verify Task Was Created with ARN
1. Open browser console (F12)
2. Go to http://localhost:3000/calendar
3. Click on the task you just created
4. Check console logs - you should see:
   ```
   [ARN Debug] Task loaded in modal: {
     taskId: "...",
     taskTitle: "Test ARN Task",
     requiresArn: true,  <-- Should be TRUE
     fullTask: {...}
   }
   ```

### Step 3: Test ARN Dialog
1. In the calendar modal, try to check a checkbox for any client
2. Check console logs - you should see:
   ```
   [ARN Debug] Toggle completion: {
     clientId: "...",
     monthKey: "...",
     isCurrentlyCompleted: false,
     taskRequiresArn: true,  <-- Should be TRUE
     shouldShowDialog: true  <-- Should be TRUE
   }
   [ARN Debug] Showing ARN dialog
   ```
3. **ARN dialog should appear!** 🎉

### Step 4: Test ARN Submission
1. In the ARN dialog:
   - Enter a 15-digit number (e.g., "123456789012345")
   - Verify your name is auto-filled
   - Click "Submit"
2. Task should be marked as complete

### Step 5: Test Without ARN
1. Create another task WITHOUT checking "Enable ARN"
2. Go to calendar and click on this task
3. Check console - `requiresArn` should be `false` or `undefined`
4. Checking boxes should work normally without ARN dialog

## If It Still Doesn't Work

### Check 1: Verify Database
1. Open Firebase Console
2. Go to Firestore Database
3. Find your task in `recurring-tasks` collection
4. Check if `requiresArn` field exists and is `true`

### Check 2: Clear Cache
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Or clear browser cache completely

### Check 3: Check Console Errors
1. Open browser console (F12)
2. Look for any red error messages
3. Share the error messages if you see any

### Check 4: Verify Task Creation
After creating a task with ARN enabled:
1. Go back to http://localhost:3000/tasks/recurring
2. Click "Edit" on the task you just created
3. Verify the "Enable ARN" checkbox is CHECKED
4. If it's not checked, the field wasn't saved

## Common Issues

### Issue: Checkbox is checked but field not saved
**Solution**: The fix in `src/app/tasks/recurring/page.tsx` should resolve this. Make sure the file was saved.

### Issue: Task loads but requiresArn is undefined
**Solution**: 
1. Delete the test task
2. Create a new one with ARN enabled
3. Old tasks created before the fix won't have the field

### Issue: Dialog doesn't appear even though requiresArn is true
**Solution**: Check browser console for JavaScript errors that might be blocking the dialog

## Success Indicators

✅ Console shows `requiresArn: true` when task loads
✅ Console shows `shouldShowDialog: true` when checking box
✅ Console shows `[ARN Debug] Showing ARN dialog`
✅ ARN dialog appears on screen
✅ Can enter 15-digit number
✅ Name is auto-filled
✅ Submit button works

## Next Steps After Testing

Once it works:
1. Remove the debug console.log statements (optional)
2. Test with multiple clients
3. Test unchecking (should not show dialog)
4. Test editing existing tasks to enable/disable ARN
