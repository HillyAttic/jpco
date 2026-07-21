# Clean Up Salary Slips Feature

## Overview

Added a "Clean Up Slips" button to the salary configuration page that allows administrators to delete all generated salary slips for a specific month and year with a single click.

## Location

- **Page**: `/admin/salary-config`
- **Tab**: "Generate Slips"
- **Position**: Left side of the action buttons area (next to "Generate & Save" button)

## Features

### 1. Clean Up Slips Button
- **Visual**: Red destructive-style button on the left
- **Label**: "Clean Up Slips" (changes to "Cleaning Up..." during operation)
- **Action**: Deletes ALL salary slips for the currently selected month and year

### 2. Safety Mechanisms

#### Double Confirmation
The feature implements a two-step confirmation process to prevent accidental deletions:

**First Confirmation:**
```
⚠️ WARNING: This will DELETE all generated salary slips for [Month] [Year].

This action cannot be undone!

Are you sure you want to proceed?
```

**Second Confirmation:**
```
FINAL CONFIRMATION: Delete all slips for this period?
```

Both confirmations must be accepted for the cleanup to proceed.

### 3. Success Feedback
After successful cleanup, shows a toast notification:
```
Successfully deleted [X] salary slip(s)
```

## Usage Instructions

### For Administrators:

1. **Navigate to Salary Configuration**
   - Go to `/admin/salary-config`
   - Click on "Generate Slips" tab

2. **Select Period**
   - Choose the **Month** from the dropdown
   - Choose the **Year** from the dropdown

3. **Review Period**
   - Double-check that you've selected the correct month and year
   - The cleanup will delete ALL slips for this period

4. **Click "Clean Up Slips"**
   - The red button on the left side
   - Read the first warning carefully
   - Click "OK" to proceed to second confirmation

5. **Final Confirmation**
   - Read the final confirmation
   - Click "OK" to confirm deletion

6. **Wait for Completion**
   - Button shows "Cleaning Up..." during the operation
   - Toast notification appears when done
   - The page refreshes automatically

## Use Cases

### When to Use Clean Up Slips:

1. **Regeneration Needed**: When you need to regenerate slips with corrected data
   - Fixed attendance records
   - Updated salary information
   - Changed deductions

2. **Testing Period**: During testing or trial runs
   - Testing the salary calculation formula
   - Verifying slip generation process

3. **Error Correction**: When slips were generated with incorrect settings
   - Wrong month/year selected
   - Incorrect payroll settings applied
   - Formula errors discovered

4. **Period Rollback**: When you need to start fresh for a specific period
   - Before finalizing payroll for the month
   - Before employee access is granted

### When NOT to Use:

⚠️ **Do NOT use if:**
- Employees have already downloaded their slips
- The period has been finalized and communicated
- You only need to modify specific employee slips (use Edit instead)
- You're not certain about the month/year selected

## Technical Details

### API Endpoint
```
POST /api/payroll/cleanup-slips
```

**Request Body:**
```json
{
  "month": 6,    // 0-11 (July = 6)
  "year": 2026
}
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 10,
  "message": "Successfully deleted 10 salary slip(s)"
}
```

### Authorization
- **Required Role**: Admin only
- **Authentication**: JWT token required
- **Permissions**: Admin role checked via `verifyAuthToken`

### Database Operations
- Queries all slips matching the month/year
- Batch deletes using Firebase Admin SDK
- Supports deletion of up to 499 slips per batch (Firebase limit)
- Automatically handles larger batches with multiple operations

### Error Handling
- Validates month (0-11) and year (2020-2099)
- Returns 403 Forbidden if non-admin attempts cleanup
- Returns 401 Unauthorized if not authenticated
- Shows appropriate error messages in toast notifications

## Workflow Comparison

### Before This Feature:
1. Admin had to manually delete each slip one by one
2. Required going to database directly
3. Risk of missing slips or deleting wrong period
4. Time-consuming for bulk operations

### After This Feature:
1. Single button click
2. Select period from UI
3. Double confirmation prevents accidents
4. Deletes all slips in one operation
5. Takes seconds instead of minutes

## Testing Instructions

### Test Case 1: Successful Cleanup
**Steps:**
1. Generate slips for July 2026 (3 employees)
2. Verify slips exist in employee salary slip page
3. As admin, select July 2026 and click "Clean Up Slips"
4. Confirm both dialogs
5. **Expected**: All 3 slips deleted, success toast shown

### Test Case 2: No Slips to Clean
**Steps:**
1. Select August 2026 (no slips generated)
2. Click "Clean Up Slips"
3. Confirm both dialogs
4. **Expected**: Success message with "0 slips deleted"

### Test Case 3: Cancellation
**Steps:**
1. Generate slips for July 2026
2. Click "Clean Up Slips"
3. Click "Cancel" on first confirmation
4. **Expected**: No slips deleted, operation cancelled

### Test Case 4: Non-Admin Access
**Steps:**
1. Log in as employee or manager
2. Try to access the API directly: `POST /api/payroll/cleanup-slips`
3. **Expected**: 403 Forbidden error

### Test Case 5: Concurrent Operations
**Steps:**
1. Click "Clean Up Slips"
2. While cleaning, try to click "Generate & Save"
3. **Expected**: Generate button is disabled during cleanup

## UI States

### Button States:

1. **Normal State**
   - Label: "Clean Up Slips"
   - Color: Red (destructive)
   - Enabled: Yes (if admin)

2. **Loading State**
   - Label: "Cleaning Up..."
   - Color: Red (destructive)
   - Spinner: Visible
   - Enabled: No

3. **Disabled State**
   - Disabled when:
     - User is generating slips
     - User is calculating salaries
     - User is not admin (shouldn't see the button)

## Security Considerations

### Access Control
- ✅ Admin-only operation
- ✅ JWT authentication required
- ✅ Role verification on server side
- ✅ No client-side bypass possible

### Data Protection
- ✅ Double confirmation required
- ✅ Clear warning messages
- ✅ Period-specific (can't accidentally delete all periods)
- ✅ Audit trail in server logs

### Audit Logging
Server logs include:
```
[API /api/payroll/cleanup-slips] POST - Admin: {uid}, Month: {month}, Year: {year}
[API /api/payroll/cleanup-slips] Deleting {count} slip(s)
[API /api/payroll/cleanup-slips] Successfully deleted {count} slip(s)
```

## Future Enhancements

Consider implementing:
1. **Selective Cleanup**: Delete slips for specific employees only
2. **Backup Before Delete**: Auto-backup slips before deletion
3. **Soft Delete**: Mark as deleted instead of permanent removal
4. **Undo Operation**: Restore recently deleted slips
5. **Activity Log**: Show cleanup history with timestamp and admin name
6. **Email Notification**: Notify affected employees if slips were already accessed
7. **Confirmation Email**: Send admin confirmation email after bulk deletion

## FAQ

**Q: Can I undo after cleanup?**
A: No, the deletion is permanent. Always double-check the period before confirming.

**Q: Will employees be notified?**
A: No, the cleanup is silent. Consider informing employees if they had already accessed their slips.

**Q: Can I clean up multiple periods at once?**
A: No, cleanup works for one period at a time. This is by design to prevent accidental large-scale deletions.

**Q: What happens to employee access toggles?**
A: Access toggles are stored separately in payroll settings and are not affected by slip cleanup. They will be reused when you generate slips again for the same period.

**Q: Does cleanup affect payroll settings or formulas?**
A: No, only the generated salary slip documents are deleted. All settings, formulas, and configurations remain intact.

## Support

If you encounter issues with the cleanup feature:
1. Check server logs for error messages
2. Verify you have admin role
3. Ensure the selected month/year is valid
4. Check that slips exist for the selected period
5. Contact technical support if the issue persists

## Changelog

### Version 1.0.0 (Current)
- Initial implementation of Clean Up Slips feature
- Double confirmation system
- Admin-only access control
- Batch deletion support
- Toast notifications for feedback
- Server-side audit logging
