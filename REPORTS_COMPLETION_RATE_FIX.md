# Reports Page Completion Rate Fix

## Issue

In the reports page table, team member mapped tasks were showing 0% completion rate even though completions were marked in the calendar.

### Visual Issue:
```
Task Name: test_Review of Financial Statements_Client Visit [Team Mapped]
Completion Rate: ████░░░░░░ 0%  ← WRONG (should show actual completion)
```

## Root Cause

The completion rate calculation was using `taskClients` which was filtered based on `contactIds`:

```typescript
const taskClients = clients.filter(c => c.id && task.contactIds?.includes(c.id));
const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);
```

For team member mapped tasks:
- `contactIds` is often empty or doesn't contain all clients
- Clients are stored in `teamMemberMappings[].clientIds`
- This resulted in `taskClients.length = 0`
- Which caused `calculateCompletionRate()` to return 0%

## Solution

Updated the client collection logic to handle both task types:

```typescript
// Get clients based on task type
let taskClients: Client[];
if (hasTeamMemberMapping) {
  // For team member mapped tasks, get all clients from mappings
  const allMappedClientIds = new Set<string>();
  task.teamMemberMappings!.forEach(mapping => {
    mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
  });
  taskClients = clients.filter(c => c.id && allMappedClientIds.has(c.id));
} else {
  // For regular tasks, use contactIds
  taskClients = clients.filter(c => c.id && task.contactIds?.includes(c.id));
}

const taskCompletions = completions.get(task.id || '') || [];
const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);
```

## How It Works

### For Team Member Mapped Tasks:

1. **Detect team member mapping**
   ```typescript
   const hasTeamMemberMapping = task.teamMemberMappings && task.teamMemberMappings.length > 0;
   ```

2. **Collect all client IDs from mappings**
   ```typescript
   const allMappedClientIds = new Set<string>();
   task.teamMemberMappings!.forEach(mapping => {
     mapping.clientIds.forEach(clientId => allMappedClientIds.add(clientId));
   });
   ```

3. **Filter clients**
   ```typescript
   taskClients = clients.filter(c => c.id && allMappedClientIds.has(c.id));
   ```

4. **Calculate completion rate**
   ```typescript
   const completionRate = calculateCompletionRate(task, taskClients.length, taskCompletions);
   ```

### For Regular Tasks:

Uses the existing logic with `contactIds`:
```typescript
taskClients = clients.filter(c => c.id && task.contactIds?.includes(c.id));
```

## Example Calculation

### Scenario:
```javascript
Task: {
  id: "task-123",
  title: "Review of Financial Statements",
  recurrencePattern: "monthly",
  teamMemberMappings: [
    { userId: "user-ajay", clientIds: ["c1", "c2"] },
    { userId: "user-pradeep", clientIds: ["c3", "c4"] }
  ]
}

Completions: [
  { clientId: "c1", monthKey: "2026-02", isCompleted: true },
  { clientId: "c2", monthKey: "2026-02", isCompleted: true },
  { clientId: "c3", monthKey: "2026-02", isCompleted: false },
  { clientId: "c4", monthKey: "2026-02", isCompleted: true }
]
```

### Before Fix:
```
taskClients.length = 0 (no clients in contactIds)
completionRate = 0%
Display: ░░░░░░░░░░ 0%
```

### After Fix:
```
allMappedClientIds = ["c1", "c2", "c3", "c4"]
taskClients.length = 4
completions = 3 completed out of 4 total
completionRate = 75%
Display: ███████░░░ 75%
```

## Visual Result

### Before:
```
┌─────────────────────────────────────────────────────────┐
│ Task Name                    │ Completion Rate          │
├─────────────────────────────────────────────────────────┤
│ Review of Financial...       │ ░░░░░░░░░░ 0%           │
│ [Team Mapped]                │                          │
└─────────────────────────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────────────────────────┐
│ Task Name                    │ Completion Rate          │
├─────────────────────────────────────────────────────────┤
│ Review of Financial...       │ ███████░░░ 75%          │
│ [Team Mapped]                │                          │
└─────────────────────────────────────────────────────────┘
```

## Files Modified

### `src/components/reports/ReportsView.tsx`

**Changes:**
- Updated client collection logic in the table rendering
- Added conditional logic to handle team member mapped tasks
- Collects client IDs from team member mappings when applicable
- Falls back to contactIds for regular tasks

## Testing

### Test Cases:

1. **Team member mapped task with completions**
   - ✅ Shows correct completion rate
   - ✅ Progress bar fills correctly
   - ✅ Percentage displays accurately

2. **Team member mapped task with no completions**
   - ✅ Shows 0% (correct)
   - ✅ No errors

3. **Regular task with contactIds**
   - ✅ Works as before
   - ✅ No regression

4. **Task with partial completions**
   - ✅ Shows correct percentage
   - ✅ Progress bar reflects actual completion

## Related Fixes

This fix completes the team member mapping feature integration:

1. ✅ Calendar client loading - Fixed in `CALENDAR_CLIENT_LOADING_FIX.md`
2. ✅ Reports modal clients - Fixed in `REPORTS_TEAM_MAPPING_FIX.md`
3. ✅ Reports table completion rate - Fixed in this document

## Impact

**Before:** Team member mapped tasks appeared to have 0% completion, making the reports page useless for tracking these tasks.

**After:** Team member mapped tasks show accurate completion rates, providing managers with proper visibility into team performance.

## Build Status

✅ **TypeScript:** No errors
✅ **Diagnostics:** Clean

---

**Fix Date:** February 10, 2026
**Status:** ✅ Complete
**Priority:** HIGH - Critical for reports functionality
