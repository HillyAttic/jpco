# Team Member Mapping - User Guide

## Quick Start

This guide explains how to use the Team Member Mapping feature for recurring tasks.

## For Managers/Admins

### Creating a Task with Team Member Mapping

1. **Navigate to Recurring Tasks**
   - Go to `/tasks/recurring`
   - Click "Create New Task"

2. **Configure Team Member Mapping**
   - Fill in task details (title, description, recurrence pattern)
   - Click the "Team Member Mapping" button
   - Select a team member from the dropdown
   - Assign clients to that team member
   - Repeat for additional team members
   - Click "Save"

3. **View Current Mappings**
   - The form shows: "1 Team Member Mapped" (or more)
   - Expand to see: "Ajay Chaudhary: 4 clients"

### Viewing Team Member Reports

1. **Navigate to Reports**
   - Go to `/reports`
   - Look for tasks with "Team Mapped" badge

2. **Open Team Member Report**
   - Click "View Details" on a team-mapped task
   - See team member cards with completion rates
   - Click a card to filter view to that member's clients
   - Click again to show all clients

3. **Understanding the Report**
   ```
   ┌──────────────────────────┐
   │ 👥 Ajay Chaudhary        │
   │ 2 clients                │
   │ ████████░░ 80%           │  ← Completion rate
   └──────────────────────────┘
   ```

## For Team Members

### Viewing Your Assigned Clients

1. **Navigate to Calendar**
   - Go to `/calendar`
   - Click on a recurring task

2. **See Your Assignments**
   - Modal shows: "Track completion for 2 clients"
   - Purple badge: "Showing only your assigned clients"
   - Only your assigned clients are visible

3. **Mark Completions**
   - Check the box for each completed client
   - If ARN is required, enter the 15-digit number
   - Click "Save Changes"

### What You'll See

**Your View (Team Member):**
```
Task: Review of Financial Statements
Track completion for 2 clients • Feb 2026 only
🟣 Showing only your assigned clients

✓ Client A (Your assignment)
✓ Client B (Your assignment)
```

**What You Won't See:**
- Clients assigned to other team members
- Tasks you're not assigned to

## Common Scenarios

### Scenario 1: "I don't see any clients"

**Possible Reasons:**
- You haven't been assigned any clients for this task
- The task doesn't use team member mapping
- Contact your manager to assign clients to you

### Scenario 2: "I see all clients, not just mine"

**Possible Reasons:**
- You're logged in as admin/manager (admins see all clients)
- The task doesn't use team member mapping
- Your user ID isn't in the team member mappings

### Scenario 3: "How do I know which tasks are assigned to me?"

**Answer:**
- All tasks you can see in the calendar are assigned to you
- The API automatically filters tasks based on your assignments
- If you see a task, you have work to do for it

## Tips & Best Practices

### For Managers:

1. **Balance Workload**: Distribute clients evenly across team members
2. **Review Reports**: Check team member completion rates regularly
3. **Update Mappings**: Reassign clients if workload becomes unbalanced
4. **Clear Communication**: Inform team members when assigning new clients

### For Team Members:

1. **Check Calendar Daily**: Stay on top of your assigned tasks
2. **Mark Completions Promptly**: Update status as soon as work is done
3. **ARN Accuracy**: Double-check ARN numbers before submitting
4. **Ask Questions**: Contact manager if unclear about assignments

## Visual Guide

### Reports Page - Team Mapped Task

```
┌─────────────────────────────────────────────────────────┐
│ Task Name                    │ Recurrence │ Clients     │
├─────────────────────────────────────────────────────────┤
│ Review of Financial...       │ Monthly    │ 4 (mapped)  │
│ [👥 Team Mapped]             │            │ ████░ 80%   │
│                              │            │ [View]      │
└─────────────────────────────────────────────────────────┘
```

### Team Member Report Modal

```
┌─────────────────────────────────────────────────────────┐
│ Review of Financial Statements                      [X] │
│ Team Member Reports • Monthly recurrence                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────┐  ┌──────────────────┐             │
│ │ 👥 Ajay          │  │ 👥 Pradeep       │             │
│ │ 2 clients        │  │ 2 clients        │             │
│ │ ████████░░ 80%   │  │ ██████░░░░ 60%   │             │
│ └──────────────────┘  └──────────────────┘             │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ℹ️ Showing 2 clients assigned to Ajay             │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Client Name    │ Jan │ Feb │ Mar │ Apr │ ...            │
│ ───────────────┼─────┼─────┼─────┼─────┼────            │
│ Client A       │  ✓  │  ✓  │  ✗  │  -  │ ...            │
│ Client B       │  ✓  │  ✗  │  ✗  │  -  │ ...            │
│                                                          │
│ Legend: ✓ Completed  ✗ Incomplete  - Future            │
└─────────────────────────────────────────────────────────┘
```

### Calendar Task Modal (Team Member View)

```
┌─────────────────────────────────────────────────────────┐
│ Review of Financial Statements                      [X] │
│ Track completion for 2 clients • Feb 2026 only          │
│ 🟣 Showing only your assigned clients                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Client Name    │ Progress │ Feb 2026                    │
│ ───────────────┼──────────┼─────────                    │
│ Client A       │ 1/1 100% │   ☑                         │
│ Client B       │ 0/1   0% │   ☐                         │
│                                                          │
│ Total: 2 clients × 1 month                              │
│                                    [Cancel] [Save]      │
└─────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Issue: "Track completion for 0 clients"

**Solution:**
- This means no clients are assigned to you for this task
- Contact your manager to assign clients
- Or the task may not have any clients configured

### Issue: Completion not saving

**Solution:**
- Check your internet connection
- Ensure you have permission to mark completions
- Try refreshing the page and trying again
- Check browser console for errors

### Issue: Can't see team member reports

**Solution:**
- Only admins/managers can access the Reports page
- Team members should use the Calendar view
- Contact admin if you need manager access

## Support

For additional help:
- Contact your system administrator
- Check the technical documentation: `TEAM_MEMBER_MAPPING_REPORTS_CALENDAR.md`
- Review the implementation guide: `TEAM_MEMBER_MAPPING_IMPLEMENTATION.md`
