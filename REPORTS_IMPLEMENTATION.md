# Reports Feature Implementation

## Overview
Implemented a comprehensive Reports page that displays task completion status from the calendar, visible only to admin and manager roles.

## Features Implemented

### 1. Role-Based Access Control
- **Reports menu item** added to sidebar with `requiresRole: ['admin', 'manager']`
- Only visible to admin and manager users
- Employees cannot see or access the Reports page
- Automatic redirect to dashboard if unauthorized user tries to access

### 2. Reports Page (`/reports`)
- **Location**: `src/app/(home)/reports/page.tsx`
- Displays all recurring tasks with completion statistics
- Shows:
  - Task name
  - Recurrence pattern (monthly, quarterly, half-yearly, yearly)
  - Total clients assigned
  - Completion rate with progress bar
  - "View Details" button for each task

### 3. Task Completion Tracking
- **New Service**: `src/services/task-completion.service.ts`
- Tracks completion status per client, per task, per month
- Stores data in Firestore collection: `task-completions`
- Data structure:
  ```typescript
  {
    recurringTaskId: string;
    clientId: string;
    monthKey: string; // Format: "YYYY-MM"
    isCompleted: boolean;
    completedAt: Date;
    completedBy: string;
  }
  ```

### 4. Reports View Component
- **Location**: `src/components/reports/ReportsView.tsx`
- Main table showing all tasks with completion statistics
- Click "View Details" to open detailed modal

### 5. Task Report Modal
- Shows calendar-style grid for selected task
- Displays all assigned clients (rows) × months (columns)
- Visual indicators:
  - ✓ **Green checkmark**: Task completed for that client/month
  - ✗ **Red X**: Task not completed (past deadline)
  - **-** Dash: Future deadline (not yet due)
- Months displayed based on recurrence pattern:
  - Monthly: All 12 months (April to March)
  - Quarterly: Every 3rd month
  - Half-yearly: Every 6th month
  - Yearly: Only April
- Sticky header and first column for easy navigation
- Legend at bottom explaining status indicators
- **Header automatically hides** when modal opens for better focus

### 6. Updated Calendar Modal
- **Location**: `src/components/recurring-tasks/RecurringTaskClientModal.tsx`
- Now saves completion data to Firestore
- Loads existing completion data when opened
- Bulk update functionality for efficient saving
- Shows loading state while fetching data
- Displays save progress

### 7. Sidebar Updates
- Added "Reports" menu item with custom icon
- **Icon**: `ReportsIcon` in `src/components/Layouts/sidebar/icons.tsx`
- Positioned after "Roster" in the MANAGEMENT section
- Only visible to admin/manager roles

## File Structure

```
src/
├── app/(home)/reports/
│   └── page.tsx                          # Reports page route
├── components/
│   ├── reports/
│   │   └── ReportsView.tsx               # Main reports component
│   ├── recurring-tasks/
│   │   └── RecurringTaskClientModal.tsx  # Updated with completion tracking
│   └── Layouts/sidebar/
│       ├── icons.tsx                     # Added ReportsIcon
│       └── data/index.ts                 # Added Reports menu item
└── services/
    └── task-completion.service.ts        # New completion tracking service
```

## Database Schema

### Collection: `task-completions`
```typescript
{
  id: string;                    // Auto-generated
  recurringTaskId: string;       // Reference to recurring task
  clientId: string;              // Reference to client
  monthKey: string;              // "YYYY-MM" format (e.g., "2025-04")
  isCompleted: boolean;          // Completion status
  completedAt: Date;             // When marked complete
  completedBy: string;           // User ID who marked it
  createdAt: Date;               // Auto-generated
  updatedAt: Date;               // Auto-generated
}
```

### Firestore Rules (Add to your rules)
```
match /task-completions/{completionId} {
  allow read: if request.auth != null && 
    (request.auth.token.role == 'admin' || 
     request.auth.token.role == 'manager');
  
  allow write: if request.auth != null && 
    (request.auth.token.role == 'admin' || 
     request.auth.token.role == 'manager');
}
```

## Usage

### For Admins/Managers:
1. Navigate to **Reports** from the sidebar
2. View all tasks with completion statistics
3. Click **View Details** on any task to see the detailed report
4. The modal shows:
   - All clients assigned to the task
   - Months based on recurrence pattern
   - Completion status for each client/month combination
5. Status indicators:
   - ✓ Green checkmark = Completed
   - ✗ Red X = Incomplete (past deadline)
   - \- Dash = Future deadline

### From Calendar View:
1. Click on a recurring task in the calendar
2. The modal opens showing all clients
3. Check/uncheck boxes to mark completion
4. Click **Save Changes** to persist to database
5. Changes will be reflected in the Reports page

## Key Features

### Completion Rate Calculation
- Only counts past and current months (excludes future months)
- Formula: `(completed tasks / total expected) × 100`
- Updates in real-time as completions are marked

### Month Display Logic
- Financial year: April to March
- Filters months based on recurrence pattern
- Automatically determines if month is past, current, or future

### Performance Optimizations
- Bulk loading of completion data
- Efficient Map-based data structures
- Minimal re-renders with proper state management

## Testing Checklist

- [ ] Reports menu item visible only to admin/manager
- [ ] Reports menu item hidden from employees
- [ ] Reports page loads all recurring tasks
- [ ] Completion rates calculate correctly
- [ ] Task detail modal opens on "View Details" click
- [ ] Modal displays correct months for each recurrence pattern
- [ ] Checkmarks show for completed tasks
- [ ] Red X shows for incomplete past tasks
- [ ] Dash shows for future deadlines
- [ ] Calendar modal saves completions to Firestore
- [ ] Reports page reflects saved completions
- [ ] Unauthorized users redirected from /reports

## Future Enhancements

1. **Export Functionality**: Export reports to Excel/PDF
2. **Filters**: Filter by date range, client, completion status
3. **Charts**: Visual charts showing completion trends
4. **Notifications**: Alert managers about overdue tasks
5. **Bulk Actions**: Mark multiple tasks as complete at once
6. **Comments**: Add notes to completion records
7. **History**: View completion history and changes over time
8. **Email Reports**: Scheduled email reports to managers

## Notes

- The Reports feature integrates seamlessly with existing calendar functionality
- All completion data is stored in Firestore for persistence
- Role-based access is enforced at both UI and route levels
- The implementation follows the existing codebase patterns and conventions
