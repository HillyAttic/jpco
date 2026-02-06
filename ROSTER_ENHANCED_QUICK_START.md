# Enhanced Roster Calendar - Quick Start Guide

## What's New?

Your roster calendar now supports **two types of tasks** with an interactive hover-based interface and color-coded duration indicators.

## Task Types

### 1. Client Tasks (Single)
- **Purpose**: Track specific client work with precise time slots
- **Fields**: Client Name, Task Detail, Start Time, End Time
- **Use Case**: "GST filing for Founders Mitra from 10:00 AM to 11:30 AM"

### 2. Activities (Multi)
- **Purpose**: Track general activities spanning multiple days
- **Fields**: Activity Name, Start Date, End Date, Notes
- **Use Case**: "Audit work from Jan 22 to Jan 24"

## How to Use

### Adding Tasks

**Method 1: Hover & Click**
1. Hover over any date in the calendar
2. Two buttons appear:
   - **Blue `+`**: Add Client Task
   - **Green `+`**: Add Activity
3. Click the appropriate button
4. Fill in the form
5. Submit

**Method 2: Click Date to View**
1. Click on any date
2. View all tasks for that day in a table
3. Click "Add" button in the table (if available)

### Viewing Tasks

**Calendar View:**
- Tasks appear as colored bubbles on dates
- Colors indicate duration:
  - 🟢 Green: Not assigned / Draft
  - 🟡 Yellow: Less than 8 hours
  - 🟠 Orange: 8 hours or more

**Table View:**
1. Click on any date
2. See all tasks in a table with columns:
   - Date
   - Client Name
   - Task Name
   - Start Time
   - End Time
   - Actions (Edit/Delete)

### Editing Tasks

**Method 1: Click Task Bubble**
- Click any task bubble in the calendar
- Edit form opens
- Make changes
- Submit

**Method 2: From Table View**
- Click on a date
- Click the edit icon (pencil) next to any task
- Edit form opens
- Make changes
- Submit

### Deleting Tasks

**From Table View:**
1. Click on a date
2. Click the delete icon (trash) next to any task
3. Confirm deletion

## Examples

### Example 1: Adding a Client Task
```
Date: February 10, 2026
Client: Founders Mitra
Task Detail: GST filing and reconciliation
Start Time: 10:00 AM
End Time: 11:30 AM
```
Result: Yellow bubble (1.5 hours < 8 hours)

### Example 2: Adding an Activity
```
Activity Name: Annual Audit
Start Date: February 15, 2026
End Date: February 17, 2026
Notes: Client site visit required
```
Result: Orange bubbles spanning 3 days (multi-day activity)

### Example 3: Viewing Tasks for a Day
```
Click: February 10, 2026
Table shows:
- 10:00 AM - 11:30 AM | Founders Mitra | GST filing
- 2:00 PM - 6:00 PM | ABC Corp | Tax consultation
```

## Tips

1. **Use Client Tasks for**:
   - Specific client meetings
   - Time-bound deliverables
   - Billable hours tracking

2. **Use Activities for**:
   - Multi-day projects
   - General work periods
   - Non-client specific tasks

3. **Color Coding**:
   - Green tasks need time assignment
   - Yellow tasks are short duration
   - Orange tasks are full-day or longer

4. **Quick Navigation**:
   - Use month arrows to navigate
   - Hover to see quick actions
   - Click dates for detailed view

## Keyboard Shortcuts

- **Hover**: Show action buttons
- **Click Date**: Open task table
- **Click Task**: Edit task
- **ESC**: Close modals (if implemented)

## Mobile Usage

- Tap on dates to view tasks
- Tap and hold for quick actions (if implemented)
- Swipe to navigate months
- All features work on mobile

## Troubleshooting

**Tasks not showing?**
- Check if you're viewing the correct month
- Verify tasks are assigned to your user ID
- Refresh the page

**Can't add tasks?**
- Ensure you're logged in
- Check if clients exist in the system
- Verify date/time is valid

**Colors not showing correctly?**
- Check if start/end times are set
- Verify duration calculation
- Refresh the page

## Data Structure

Tasks are stored in `/rosters` collection with:
```json
{
  "taskType": "single" or "multi",
  "userId": "your-user-id",
  "userName": "your-name",
  
  // For client tasks
  "clientId": "client-id",
  "clientName": "Client Name",
  "taskDetail": "Task description",
  "timeStart": "2026-02-10T10:00:00",
  "timeEnd": "2026-02-10T11:30:00",
  
  // For activities
  "activityName": "Activity Name",
  "startDate": "2026-02-15",
  "endDate": "2026-02-17",
  "notes": "Optional notes"
}
```

## Next Steps

1. Start adding your first client task
2. Create an activity for a multi-day project
3. Click on dates to view your schedule
4. Use color coding to manage workload

## Support

For issues or questions, check:
- Console for error messages
- Firestore rules are correct
- Clients collection has data
- User permissions are set
