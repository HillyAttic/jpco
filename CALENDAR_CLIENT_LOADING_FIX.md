# Calendar Client Loading Fix

## Issue

When opening a recurring task in the calendar that was assigned via Team Member Mapping, the modal showed "Track completion for 0 clients" and displayed "No clients assigned to you for this task" even though clients were assigned to the user.

## Root Cause

The `handleTaskClick` function in `src/components/calendar-view.tsx` was only loading clients from the task's `contactIds` array. However, when a task uses Team Member Mapping, the clients are stored in the `teamMemberMappings` array, not in `contactIds`.

### Before:
```typescript
const contactIds = recurringTask.contactIds || [];

// Only fetched clients from contactIds
if (contactIds.length > 0) {
  const assignedClients = allClients.filter((client: any) => 
    contactIds.includes(client.id)
  );
  setClients(assignedClients);
}
```

This meant:
- If a task had team member mappings but empty `contactIds`, no clients were loaded
- The modal received an empty clients array
- Even though the modal had filtering logic, it had no clients to filter

## Solution

Updated the `handleTaskClick` function to collect client IDs from BOTH sources:
1. Direct assignment via `contactIds`
2. Team member mappings via `teamMemberMappings[].clientIds`

### After:
```typescript
// Collect all client IDs from both contactIds and team member mappings
const contactIds = recurringTask.contactIds || [];
const teamMemberMappings = recurringTask.teamMemberMappings || [];

// Get all unique client IDs from team member mappings
const mappedClientIds = new Set<string>();
teamMemberMappings.forEach((mapping: any) => {
  if (mapping.clientIds && Array.isArray(mapping.clientIds)) {
    mapping.clientIds.forEach((clientId: string) => mappedClientIds.add(clientId));
  }
});

// Combine contactIds and mapped client IDs
const allClientIds = [...new Set([...contactIds, ...Array.from(mappedClientIds)])];

// Fetch clients for all IDs
if (allClientIds.length > 0) {
  const assignedClients = allClients.filter((client: any) => 
    allClientIds.includes(client.id)
  );
  setClients(assignedClients);
}
```

## How It Works Now

### Data Flow:

1. **User clicks task in calendar**
   - `handleTaskClick` is triggered

2. **Fetch full recurring task**
   - Gets task details including `contactIds` and `teamMemberMappings`

3. **Collect all client IDs**
   - From `contactIds` array (direct assignments)
   - From `teamMemberMappings[].clientIds` arrays (team member assignments)
   - Combines and deduplicates using Set

4. **Fetch all assigned clients**
   - Loads all clients from API
   - Filters to only those in the combined client IDs list
   - Passes to modal

5. **Modal filters for current user**
   - Modal receives ALL clients assigned to the task
   - `getFilteredClients()` in modal filters based on user's team member mapping
   - User sees only their assigned clients

### Example Scenario:

**Task Configuration:**
```javascript
{
  id: "task-123",
  title: "Review of Financial Statements",
  contactIds: [], // Empty - using team member mappings instead
  teamMemberMappings: [
    {
      userId: "user-ajay",
      userName: "Ajay Chaudhary",
      clientIds: ["client-1", "client-2"]
    },
    {
      userId: "user-pradeep",
      userName: "Pradeep Bera",
      clientIds: ["client-3", "client-4"]
    }
  ]
}
```

**Before Fix:**
- `allClientIds` = [] (empty, only looked at contactIds)
- Clients loaded = 0
- Modal shows: "Track completion for 0 clients"

**After Fix:**
- `allClientIds` = ["client-1", "client-2", "client-3", "client-4"]
- Clients loaded = 4
- Modal receives all 4 clients
- Modal filters based on user:
  - Ajay sees: client-1, client-2 (2 clients)
  - Pradeep sees: client-3, client-4 (2 clients)
  - Admin sees: all 4 clients

## Files Modified

### `src/components/calendar-view.tsx`
- Updated `handleTaskClick` function
- Added logic to collect client IDs from team member mappings
- Added console logging for debugging

## Testing

### Test Cases:

1. **Task with team member mappings only**
   - ✅ Clients load correctly
   - ✅ User sees their assigned clients
   - ✅ Modal shows correct count

2. **Task with contactIds only (no mappings)**
   - ✅ Works as before
   - ✅ All assigned clients shown

3. **Task with both contactIds and mappings**
   - ✅ Combines both sources
   - ✅ No duplicates
   - ✅ All clients available

4. **Task with no clients at all**
   - ✅ Shows "No clients assigned" message
   - ✅ No errors

5. **User not in team member mappings**
   - ✅ Shows all clients (admin/manager behavior)
   - ✅ No filtering applied

## Debug Logging

Added console logs to help troubleshoot:

```javascript
console.log('[Calendar] Loading clients for task:', {
  taskId: recurringTask.id,
  taskTitle: recurringTask.title,
  contactIds: contactIds.length,
  teamMemberMappings: teamMemberMappings.length,
  mappedClientIds: mappedClientIds.size,
  totalClientIds: allClientIds.length
});

console.log('[Calendar] Loaded clients:', {
  totalClients: allClients.length,
  assignedClients: assignedClients.length,
  clientNames: assignedClients.map((c: any) => c.name)
});
```

Check browser console to see:
- How many clients are being loaded
- Which clients are assigned
- Whether team member mappings are present

## Build Status

✅ **Build Successful**
- No TypeScript errors
- No compilation errors
- All routes generated correctly

## Related Documentation

- `TEAM_MEMBER_MAPPING_REPORTS_CALENDAR.md` - Full feature documentation
- `TEAM_MEMBER_MAPPING_USER_GUIDE.md` - User guide
- `IMPLEMENTATION_SUMMARY_TEAM_MAPPING.md` - Implementation summary

## Deployment

This fix is ready for deployment. It's a critical bug fix that enables the team member mapping feature to work correctly in the calendar view.

### Deployment Priority: HIGH
- Users cannot mark task completions without this fix
- Affects all tasks using team member mapping
- No breaking changes to existing functionality

---

**Fix Date:** February 10, 2026
**Status:** ✅ Complete and Tested
**Build Status:** ✅ Successful
