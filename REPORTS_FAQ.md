# Reports Feature - Frequently Asked Questions

## General Questions

### Q1: What is the Reports feature?
**A:** The Reports feature displays task completion status from the calendar in a comprehensive view. It shows which clients have completed their tasks for each month, with visual indicators (✓, ✗, -) to quickly identify completed, incomplete, and future tasks.

### Q2: Who can access the Reports page?
**A:** Only users with Admin or Manager roles can access the Reports page. Employees cannot see or access this feature.

### Q3: Where is the Reports page located?
**A:** The Reports page is accessible from the sidebar menu under the "MANAGEMENT" section. The URL is `/reports`.

### Q4: What does the Reports page show?
**A:** The Reports page shows:
- All recurring tasks
- Number of clients assigned to each task
- Recurrence pattern (monthly, quarterly, etc.)
- Completion rate with visual progress bar
- Detailed view of client/month completion status

## Status Indicators

### Q5: What do the status indicators mean?
**A:**
- **✓ Green Checkmark**: Task completed for that client/month
- **✗ Red X**: Task not completed (past deadline)
- **- Dash**: Future deadline (not yet due)

### Q6: Why do some months show a dash (-)?
**A:** The dash indicates that the deadline for that month hasn't arrived yet. It's a future month, so the task isn't due yet.

### Q7: When does a month change from dash (-) to red X (✗)?
**A:** When the month becomes the current month or passes, and the task hasn't been marked as complete, it changes from dash to red X.

## Completion Tracking

### Q8: How do I mark a task as complete?
**A:** 
1. Go to the Calendar view
2. Click on the recurring task
3. A modal opens showing all clients
4. Check the boxes for clients/months you want to mark complete
5. Click "Save Changes"

### Q9: Can I mark future months as complete?
**A:** Yes, you can check boxes for future months in the calendar modal. This is useful for planning ahead.

### Q10: How do I unmark a completed task?
**A:** 
1. Go to Calendar view
2. Click on the task
3. Uncheck the box for the client/month
4. Click "Save Changes"

### Q11: Do changes in the calendar modal reflect in Reports immediately?
**A:** Yes, after saving changes in the calendar modal, the Reports page will reflect the updated completion status when you refresh or navigate back to it.

## Recurrence Patterns

### Q12: Why do different tasks show different numbers of months?
**A:** The number of months displayed depends on the recurrence pattern:
- **Monthly**: Shows all 12 months (April to March)
- **Quarterly**: Shows 4 months (every 3rd month)
- **Half-yearly**: Shows 2 months (every 6th month)
- **Yearly**: Shows 1 month (only April)

### Q13: Why does the year start from April?
**A:** The system uses a financial year calendar, which runs from April to March. This is common in many countries for tax and compliance purposes.

### Q14: Can I change the financial year start month?
**A:** Currently, the system is configured for April-March financial year. To change this, you would need to modify the `generateMonths()` function in the code.

## Completion Rate

### Q15: How is the completion rate calculated?
**A:** 
```
Completion Rate = (Completed Tasks / Total Expected) × 100%

Where:
- Completed Tasks = Number of client/month combinations marked complete
- Total Expected = Number of clients × Number of past/current months
```

### Q16: Why doesn't the completion rate include future months?
**A:** Future months are excluded from the calculation because the tasks aren't due yet. Including them would artificially lower the completion rate.

### Q17: What's considered a good completion rate?
**A:**
- **90-100%**: Excellent - Most tasks completed on time
- **75-89%**: Good - Some delays but manageable
- **50-74%**: Fair - Significant delays, needs attention
- **Below 50%**: Poor - Urgent action required

## Data and Storage

### Q18: Where is the completion data stored?
**A:** Completion data is stored in Firestore in a collection called `task-completions`. Each record contains:
- Recurring task ID
- Client ID
- Month key (YYYY-MM format)
- Completion status
- Completion date and user

### Q19: Is the data backed up?
**A:** Yes, Firestore automatically backs up your data. You can also set up additional backup strategies through Firebase.

### Q20: Can I export the reports?
**A:** Currently, there's no built-in export feature. This is planned for a future enhancement. You can manually copy data or take screenshots for now.

## Permissions and Security

### Q21: Can employees see any part of the Reports feature?
**A:** No, employees cannot see the Reports menu item, cannot access the `/reports` URL, and cannot read completion data from Firestore.

### Q22: What happens if an employee tries to access /reports directly?
**A:** They will be automatically redirected to the dashboard. The page checks user role before displaying any content.

### Q23: Can managers edit completion data?
**A:** Yes, both managers and admins can mark tasks as complete or incomplete through the calendar modal.

### Q24: Are there audit logs for completion changes?
**A:** Yes, each completion record stores who marked it complete (`completedBy` field) and when (`completedAt` field).

## Technical Questions

### Q25: What happens if I have no recurring tasks?
**A:** The Reports page will display an empty table with a message indicating no tasks are available.

### Q26: What if a task has no clients assigned?
**A:** The task will still appear in the Reports list with "0 clients" and a completion rate of 0%. The detail modal will show "No clients assigned to this task".

### Q27: How many clients can a task have?
**A:** There's no hard limit, but performance may degrade with very large numbers (1000+). The system is optimized for typical use cases (up to 1000 clients per task).

### Q28: Does the Reports page work on mobile?
**A:** Yes, the Reports page is fully responsive and works on mobile devices. Tables scroll horizontally if needed.

## Troubleshooting

### Q29: The Reports menu isn't showing up. What should I check?
**A:**
1. Verify you're logged in as admin or manager
2. Check your user role in Firebase Auth custom claims
3. Clear browser cache and reload
4. Check browser console for errors

### Q30: I'm getting "Missing or insufficient permissions" error. What should I do?
**A:**
1. Verify Firestore rules are deployed
2. Check your user role in Firebase Auth
3. Sign out and sign in again to refresh your token
4. Contact your system administrator

### Q31: Completion data isn't saving. What's wrong?
**A:**
1. Check browser console for errors
2. Verify Firestore rules allow write access
3. Check your internet connection
4. Verify you're logged in as admin/manager
5. Check Firebase Console for any issues

### Q32: The completion rate seems wrong. How do I fix it?
**A:**
1. Verify the current date/time is correct
2. Check that completion records have correct monthKey format
3. Refresh the page to recalculate
4. Check Firestore data for inconsistencies

### Q33: The modal is showing wrong months. What's the issue?
**A:**
1. Check the task's recurrence pattern
2. Verify the financial year settings
3. Check browser console for date calculation errors
4. Ensure system date/time is correct

## Best Practices

### Q34: How often should I check the Reports page?
**A:** It's recommended to check Reports:
- Daily: For high-priority tasks
- Weekly: For regular monitoring
- Monthly: For overall performance review

### Q35: What should I do when I see red X marks?
**A:**
1. Identify which clients have pending tasks
2. Contact the responsible team member
3. Follow up on the pending work
4. Mark as complete once done

### Q36: Should I mark tasks complete in advance?
**A:** It's better to mark tasks complete only after they're actually done. However, you can plan ahead by checking boxes for future months if you're certain they'll be completed.

### Q37: How do I track team performance?
**A:**
1. Check completion rates for each task
2. Identify patterns of delays
3. Look for specific clients with recurring issues
4. Use the data for team meetings and reviews

## Future Enhancements

### Q38: Will there be an export feature?
**A:** Yes, export to Excel/PDF is planned for a future release.

### Q39: Can we get email notifications for overdue tasks?
**A:** Email notifications are planned as a future enhancement.

### Q40: Will there be charts and graphs?
**A:** Yes, visual charts showing completion trends are planned for a future release.

### Q41: Can we filter reports by date range?
**A:** Date range filtering is planned as a future enhancement.

### Q42: Will there be a print-friendly view?
**A:** A print-friendly report format is planned for a future release.

## Getting Help

### Q43: Where can I find more documentation?
**A:** Check these files:
- `REPORTS_IMPLEMENTATION.md` - Technical documentation
- `REPORTS_QUICK_START.md` - Quick start guide
- `REPORTS_FLOW_DIAGRAM.md` - Visual diagrams
- `REPORTS_VISUAL_EXAMPLE.md` - Visual examples

### Q44: Who do I contact for support?
**A:** Contact your system administrator or development team for technical support.

### Q45: How do I report a bug?
**A:**
1. Note the exact steps to reproduce the issue
2. Check browser console for error messages
3. Take screenshots if applicable
4. Report to your development team with all details

### Q46: Can I request new features?
**A:** Yes, discuss feature requests with your development team. They can evaluate and prioritize based on business needs.

## Quick Reference

### Common Tasks

**View all task completion rates:**
1. Click "Reports" in sidebar
2. View the table

**See detailed completion status:**
1. Click "View Details" on any task
2. Review the client/month grid

**Mark tasks complete:**
1. Go to Calendar
2. Click task
3. Check boxes
4. Save changes

**Check specific client status:**
1. Open task detail modal
2. Find client in the list
3. Review their row

**Identify overdue tasks:**
1. Look for red X marks in detail modal
2. These are past deadlines not completed

---

**Need more help?** Check the documentation files or contact your system administrator.
