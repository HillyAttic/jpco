# Team Member Mapping Save Fix

## Issue
When editing a recurring task at `/tasks/recurring`, the team member mappings were not being saved or loaded. Users would configure mappings, save the task, but when reopening the edit dialog, the mappings would be empty.

## Root Cause
The PUT endpoint validation schema in `src/app/api/recurring-tasks/[id]/route.ts` was missing the `teamMemberMappings` field. When updating a task, the Zod validation schema would strip out any fields not explicitly defined, causing the `teamMemberMappings` data to be lost during updates.

## Solution
Added `teamMemberMappings` field to the `updateRecurringTaskSchema` validation schema:

```typescript
teamMemberMappings: z.array(z.object({
  userId: z.string(),
  userName: z.string(),
  clientIds: z.array(z.string()),
})).optional(),
```

## Files Modified
- `src/app/api/recurring-tasks/[id]/route.ts` - Added `teamMemberMappings` to validation schema

## How It Works Now

### Create Flow
1. Admin creates recurring task at `/tasks/recurring`
2. Clicks "Configure Team Member Mapping" button
3. Selects team members and assigns clients to each
4. Saves the task
5. `teamMemberMappings` is included in POST request and saved to Firestore

### Edit Flow
1. Admin clicks edit on existing recurring task
2. Modal opens and loads task data from API
3. `RecurringTaskModal` useEffect (lines 243-280) detects `task.teamMemberMappings` and loads them into state
4. Mappings are displayed in the summary section
5. Admin can modify mappings by clicking "Configure Team Member Mapping"
6. On save, `teamMemberMappings` is now properly included in PUT request
7. Firestore updates the task with new mappings

### Data Flow
```
Firestore → GET /api/recurring-tasks → useRecurringTasks hook → RecurringTaskModal
                                                                         ↓
                                                                   useEffect loads
                                                                   teamMemberMappings
                                                                         ↓
User edits mappings → TeamMemberMappingDialog → setTeamMemberMappings
                                                         ↓
                                                   handleFormSubmit
                                                         ↓
                                            PUT /api/recurring-tasks/[id]
                                                         ↓
                                            ✅ Now includes teamMemberMappings
                                                         ↓
                                                     Firestore
```

## Testing Steps
1. Create a new recurring task with team member mappings
2. Save the task
3. Edit the same task
4. Verify mappings appear in the dialog
5. Modify the mappings (add/remove team members or clients)
6. Save the task
7. Edit again and verify changes were persisted

## Related Features
- Team Member Mapping allows admins to assign specific clients to individual team members
- Employees see only their assigned clients in the dashboard
- Plan Task feature uses these mappings to show only assigned clients
- Dashboard filters recurring tasks based on mappings

## Status
✅ Fixed - Team member mappings now save and load correctly during edit operations
