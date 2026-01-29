# Reports Feature - Quick Start Guide

## What Was Implemented

A **Reports** page that shows task completion status from the calendar, visible only to admin/manager roles.

## Quick Overview

### Visual Indicators in Reports
- ✓ **Green Checkmark** = Task completed
- ✗ **Red X** = Task not completed (past deadline)  
- **-** Dash = Future deadline (not yet due)

### Access
- **URL**: `/reports`
- **Visible to**: Admin and Manager only
- **Hidden from**: Employees

## Files Created/Modified

### New Files
1. `src/app/(home)/reports/page.tsx` - Reports page route
2. `src/components/reports/ReportsView.tsx` - Main reports component
3. `src/services/task-completion.service.ts` - Completion tracking service

### Modified Files
1. `src/components/Layouts/sidebar/icons.tsx` - Added ReportsIcon
2. `src/components/Layouts/sidebar/data/index.ts` - Added Reports menu item
3. `src/components/recurring-tasks/RecurringTaskClientModal.tsx` - Added completion tracking

## Database Setup Required

### Add Firestore Collection
The system will automatically create a `task-completions` collection when you first mark a task as complete.

### Update Firestore Rules
Add these rules to your `firestore.rules` file:

```javascript
match /task-completions/{completionId} {
  allow read: if request.auth != null && 
    (request.auth.token.role == 'admin' || 
     request.auth.token.role == 'manager');
  
  allow write: if request.auth != null && 
    (request.auth.token.role == 'admin' || 
     request.auth.token.role == 'manager');
}
```

Then deploy the rules:
```bash
firebase deploy --only firestore:rules
```

## How to Use

### Step 1: Access Reports
1. Log in as an admin or manager
2. Look for **Reports** in the sidebar (under MANAGEMENT section)
3. Click to open the Reports page

### Step 2: View Task Statistics
- See all recurring tasks with:
  - Task name
  - Recurrence pattern (monthly/quarterly/etc.)
  - Number of clients
  - Completion rate with progress bar

### Step 3: View Detailed Report
1. Click **View Details** on any task
2. Modal opens showing:
   - All clients (rows)
   - Months based on recurrence pattern (columns)
   - Completion status for each client/month

### Step 4: Mark Completions (from Calendar)
1. Go to Calendar view
2. Click on a recurring task
3. Check/uncheck boxes for each client/month
4. Click **Save Changes**
5. Changes appear in Reports page

## Example Scenario

**Task**: GSTR1 (Monthly recurrence)  
**Clients**: 630 clients  
**Months**: April 2025 to March 2026

### In Reports Page:
```
Task Name: GSTR1
Recurrence: monthly
Total Clients: 630
Completion Rate: [████████░░] 75%
[View Details]
```

### In Detail Modal:
```
Client Name    | Apr | May | Jun | Jul | Aug | ...
---------------|-----|-----|-----|-----|-----|----
ABC Corp       |  ✓  |  ✓  |  ✗  |  -  |  -  | ...
XYZ Ltd        |  ✓  |  ✗  |  ✗  |  -  |  -  | ...
...
```

Legend:
- ✓ = Completed
- ✗ = Incomplete (past deadline)
- \- = Future deadline

## Testing the Feature

### Test 1: Role-Based Access
1. Log in as employee → Reports menu should NOT appear
2. Log in as manager → Reports menu SHOULD appear
3. Try accessing `/reports` as employee → Should redirect to dashboard

### Test 2: View Reports
1. Log in as admin/manager
2. Navigate to Reports
3. Verify all recurring tasks are listed
4. Check completion rates are calculated correctly

### Test 3: Detailed View
1. Click "View Details" on a task
2. Verify modal opens with client/month grid
3. Check status indicators (✓, ✗, -) are correct
4. Verify future months show dash (-)

### Test 4: Mark Completions
1. Go to Calendar view
2. Click a recurring task
3. Check some boxes for clients/months
4. Click "Save Changes"
5. Go back to Reports
6. Verify completion rate updated
7. Open detail modal
8. Verify checkmarks appear for marked items

## Troubleshooting

### Reports menu not showing
- Check user role (must be admin or manager)
- Verify `requiresRole: ['admin', 'manager']` in sidebar data
- Check authentication context is loaded

### Completion data not saving
- Verify Firestore rules are deployed
- Check browser console for errors
- Ensure user has write permissions
- Verify `task-completions` collection exists

### Wrong completion status
- Check system date/time is correct
- Verify month calculation logic
- Ensure completion data has correct monthKey format ("YYYY-MM")

### Performance issues
- Limit number of tasks loaded initially
- Add pagination if needed
- Consider caching completion data

## Next Steps

1. **Deploy Firestore Rules** (see Database Setup above)
2. **Test with Sample Data**: Create a recurring task with a few clients
3. **Mark Some Completions**: Use the calendar modal to mark tasks complete
4. **View Reports**: Check the Reports page to see the data
5. **Verify Role Access**: Test with different user roles

## Support

For issues or questions:
1. Check `REPORTS_IMPLEMENTATION.md` for detailed documentation
2. Review browser console for errors
3. Verify Firestore rules are correctly deployed
4. Check that user roles are properly set in Firebase Auth custom claims
