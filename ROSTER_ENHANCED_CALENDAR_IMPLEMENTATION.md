# Enhanced Roster Calendar Implementation

## Overview
Enhanced the roster update-schedule page with interactive calendar features, unified task structure supporting both client-based tasks and activity-based tasks, and color-coded duration indicators.

## Key Features

### 1. Unified Task Structure
Combined two task types in a single collection (`/rosters`):

**Task Types:**
- `single` - Client-based tasks (specific time slots)
- `multi` - Activity-based tasks (date ranges)

**Schema:**
```typescript
{
  taskType: "single | multi",
  
  // Common fields
  userId: string,
  userName: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  
  // Multi-task fields
  activityName?: string,
  notes?: string,
  startDate?: timestamp,
  endDate?: timestamp,
  month?: number,
  year?: number,
  createdBy?: string,
  
  // Single-task fields
  clientId?: string,
  clientName?: string,
  taskDetail?: string,
  timeStart?: timestamp,
  timeEnd?: timestamp,
  taskDate?: string,        // YYYY-MM-DD for fast querying
  durationHours?: number    // Pre-calculated for performance
}
```

### 2. Interactive Calendar

**Hover Interactions:**
- Hover over any date to see action buttons
- Two buttons appear:
  - Blue `+` button: Add Client Task (single)
  - Green `+` button: Add Activity (multi)

**Click Interactions:**
- Click on a date to view all tasks for that day in a table
- Click on a task bubble to edit it
- Edit/Delete buttons in task table

### 3. Color-Coded Duration

**Color Rules:**
- 🟢 **Green**: Not assigned / Draft (no time info)
- 🟡 **Yellow**: Less than 8 hours
- 🟠 **Orange**: 8 hours or more

**Implementation:**
```typescript
function getTaskColor(task: RosterEntry): string {
  const duration = calculateDuration(start, end);
  if (!duration) return "green";
  if (duration < 8) return "yellow";
  return "orange";
}
```

### 4. Task Table View

When clicking a date, shows a table with columns:
- Date
- Client Name (or "—" for activities)
- Task Name (taskDetail or activityName)
- Start Time
- End Time
- Actions (Edit/Delete)

**Features:**
- Sorted by start time
- Empty state message
- Inline edit/delete actions

### 5. Client Integration

**Client Dropdown:**
- Fetches from `/clients` collection
- Shows only active clients
- Auto-populates client name on selection

**Form Fields for Single Tasks:**
1. Client (dropdown from Firestore)
2. Task Detail (text input)
3. Start Time (datetime-local)
4. End Time (datetime-local)

**Form Fields for Multi Tasks:**
1. Activity Name (text input)
2. Start Date (date)
3. End Date (date)
4. Notes (textarea, optional)

## Files Modified

### 1. `src/types/roster.types.ts`
- Added `TaskType` union type
- Updated `RosterEntry` interface with optional fields
- Made fields conditional based on `taskType`

### 2. `src/services/roster.service.ts`
- Updated `convertTimestamps()` to handle optional dates
- Added `calculateDuration()` helper
- Added `getTaskColor()` export
- Updated `createRosterEntry()` with type-specific validation
- Updated `updateRosterEntry()` with type-specific validation
- Added `getTasksForDate()` method

### 3. `src/app/roster/update-schedule/page.tsx`
- Complete rewrite with new features
- Added hover state management
- Added task table modal
- Added client dropdown integration
- Added color-coded task display
- Added dual task type support

## Usage Guide

### Adding a Client Task
1. Hover over a date
2. Click the blue `+` button
3. Select client from dropdown
4. Enter task details
5. Set start and end times
6. Submit

### Adding an Activity
1. Hover over a date
2. Click the green `+` button
3. Enter activity name
4. Set start and end dates
5. Add optional notes
6. Submit

### Viewing Tasks for a Date
1. Click on any date in the calendar
2. View all tasks in the table
3. Edit or delete tasks inline
4. Close modal to return to calendar

### Editing a Task
- Click on a task bubble in the calendar, OR
- Click the edit icon in the task table
- Modify fields
- Submit changes

### Deleting a Task
- Click the delete icon in the task table
- Confirm deletion

## Performance Optimizations

1. **Pre-calculated Duration:**
   - `durationHours` stored at save time
   - Instant color calculation

2. **Task Date Field:**
   - `taskDate` (YYYY-MM-DD) for fast Firestore queries
   - Enables efficient date-based filtering

3. **Client-side Filtering:**
   - Calendar day filtering done in memory
   - Reduces Firestore reads

## Data Migration

**Existing Data:**
All existing roster entries will continue to work. To migrate:

1. Add `taskType: "multi"` to existing entries
2. Existing fields (`activityName`, `startDate`, `endDate`) remain unchanged
3. No data loss or breaking changes

**Migration Script (if needed):**
```typescript
// Run once to update existing entries
const entries = await rosterService.getRosterEntries({});
for (const entry of entries) {
  if (!entry.taskType) {
    await rosterService.updateRosterEntry(entry.id!, {
      taskType: 'multi'
    });
  }
}
```

## Firestore Rules

Ensure your Firestore rules allow:
```
match /rosters/{rosterId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && 
                request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && 
                         resource.data.userId == request.auth.uid;
}

match /clients/{clientId} {
  allow read: if request.auth != null;
}
```

## Testing Checklist

- [ ] Create single task (client-based)
- [ ] Create multi task (activity-based)
- [ ] Edit both task types
- [ ] Delete both task types
- [ ] View task table for a date
- [ ] Verify color coding (green/yellow/orange)
- [ ] Test hover interactions
- [ ] Test client dropdown population
- [ ] Test date validation
- [ ] Test time validation
- [ ] Test overlap detection (multi tasks)
- [ ] Test calendar navigation
- [ ] Test mobile responsiveness

## Future Enhancements

1. **Drag & Drop:** Move tasks between dates
2. **Recurring Tasks:** Support for repeating tasks
3. **Task Templates:** Save common task configurations
4. **Bulk Operations:** Add multiple tasks at once
5. **Export:** Download schedule as PDF/Excel
6. **Notifications:** Reminders for upcoming tasks
7. **Time Tracking:** Actual vs planned time
8. **Task Dependencies:** Link related tasks

## Support

For issues or questions:
1. Check console for error messages
2. Verify Firestore rules are correct
3. Ensure clients collection exists and has data
4. Check user permissions (userId matching)
