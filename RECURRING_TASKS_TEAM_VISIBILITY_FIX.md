# Recurring Tasks Team Visibility Fix

## Problem
When a recurring task was assigned to a team by an admin (e.g., JPCOjpco@gmail.com), team members could not see the task in:
- The recurring tasks page (http://localhost:3000/tasks/recurring)
- The dashboard
- The calendar view

The issue was that the system only checked if a user's ID was in the `contactIds` array, but didn't check if the user was a member of the assigned team.

## Root Cause
1. **API Route Filtering**: The `/api/recurring-tasks` route only filtered by `contactIds`, ignoring team membership
2. **Direct Service Calls**: Dashboard and calendar pages were calling `recurringTaskService.getAll()` directly, bypassing the API route's filtering logic entirely

## Solution

### 1. Updated API Route (`src/app/api/recurring-tasks/route.ts`)
Modified the GET endpoint to check both direct assignment and team membership:

```typescript
// Get user's teams to check team assignments
const { teamService } = await import('@/services/team.service');
const userTeams = await teamService.getTeamsByMember(userId);
const userTeamIds = userTeams.map(team => team.id);

// Employees see tasks that are:
// 1. Directly assigned to them (in contactIds), OR
// 2. Assigned to a team they are a member of
tasks = tasks.filter(task => {
  const isDirectlyAssigned = task.contactIds && 
    Array.isArray(task.contactIds) && 
    task.contactIds.includes(userId);
  
  const isTeamAssigned = task.teamId && userTeamIds.includes(task.teamId);
  
  return isDirectlyAssigned || isTeamAssigned;
});
```

### 2. Updated Dashboard (`src/app/dashboard/page.tsx`)
Changed from direct service call to API call:

**Before:**
```typescript
const recurringTasks = await recurringTaskService.getAll();
```

**After:**
```typescript
const token = await currentUser.getIdToken();
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
};

const recurringResponse = await fetch('/api/recurring-tasks', { headers });
const recurringTasks = await recurringResponse.json();
```

### 3. Updated Calendar (`src/app/calendar/page.tsx`)
Applied the same API-based approach as the dashboard.

## How It Works Now

When a recurring task is created with a team assignment:

1. **Admin/Manager creates task**:
   - Selects a team from the dropdown
   - Task is saved with `teamId` field

2. **Team member views tasks**:
   - API fetches user's team memberships
   - Filters tasks to show:
     - Tasks directly assigned to the user (in `contactIds`)
     - Tasks assigned to any team the user is a member of (via `teamId`)

3. **Task visibility**:
   - All team members (including the leader) can see the task
   - Task appears in recurring tasks page, dashboard, and calendar
   - Each team member can complete their own instance of the recurring task

## Team Structure

Teams have the following structure:
- `id`: Unique team identifier
- `name`: Team name
- `leaderId`: ID of the team leader
- `memberIds`: Array of member IDs
- `members`: Array of member objects with details

When a task has a `teamId`, all users whose ID appears in that team's `memberIds` or `members` array can see the task.

## Testing

1. **Create a team** with multiple members (e.g., 4 members + 1 leader)
2. **Create a recurring task** as admin and assign it to the team
3. **Log in as each team member** and verify:
   - Task appears in http://localhost:3000/tasks/recurring
   - Task appears in the dashboard
   - Task appears in the calendar view
4. **Verify filtering**:
   - Admin/Manager sees all tasks
   - Team members only see tasks assigned to them or their teams

## Benefits

✅ Team-based task assignment now works correctly
✅ All team members can see tasks assigned to their team
✅ Consistent filtering across all views (recurring tasks page, dashboard, calendar)
✅ Maintains security - employees only see their assigned tasks
✅ Admins/Managers still see all tasks

## Related Files Modified

- `src/app/api/recurring-tasks/route.ts` - Added team membership filtering
- `src/app/dashboard/page.tsx` - Changed to use API instead of direct service call
- `src/app/calendar/page.tsx` - Changed to use API instead of direct service call
- `src/services/firebase.service.ts` - Added `forceServerFetch` option (from previous fix)
- `src/services/recurring-task.service.ts` - Enabled `forceServerFetch` (from previous fix)
