# Delete Glitch Fix - Non-Recurring Tasks

## Problem
When trying to delete tasks from the list view on the non-recurring tasks page (http://localhost:3000/tasks/non-recurring), the delete button appeared to be glitching and not working properly.

## Root Cause
The delete functionality had a two-click confirmation mechanism:
1. First click: Set `showDeleteConfirm` state to show a confirmation overlay
2. Second click: Actually delete the task

However, the confirmation overlay was **only implemented for grid view** (TaskCard), not for list view (TaskListView). When users clicked delete in list view:
- The state was set to show confirmation
- But no visual feedback was displayed
- Users had to click delete again within 3 seconds to actually delete
- This made it appear glitchy and confusing

## Solution
Replaced the two-click confirmation mechanism with a proper confirmation dialog that works for both grid and list views:

1. **Single Click Delete**: Now clicking delete once opens a confirmation dialog
2. **Consistent UX**: Same confirmation dialog for both grid and list views
3. **Clear Feedback**: Users see a modal dialog asking for confirmation
4. **Reused Component**: Uses the existing `BulkDeleteDialog` component for consistency

## Changes Made

### Modified Files
- `src/app/tasks/non-recurring/page.tsx`

### Key Changes

1. **Removed the two-click mechanism**:
   ```typescript
   // OLD: Required clicking delete twice
   if (showDeleteConfirm === id) {
     await deleteTask(id);
   } else {
     setShowDeleteConfirm(id);
     setTimeout(() => setShowDeleteConfirm(null), 3000);
   }
   ```

2. **Added proper confirmation dialog**:
   ```typescript
   // NEW: Single click opens dialog
   const handleDelete = (id: string) => {
     setTaskToDelete(id);
     setShowDeleteDialog(true);
   };
   
   const handleConfirmDelete = async () => {
     await deleteTask(taskToDelete);
     setShowDeleteDialog(false);
   };
   ```

3. **Removed grid view overlay**: Deleted the inline confirmation overlay that only worked in grid view

4. **Added dialog component**: Reused the `BulkDeleteDialog` component for single task deletion

## Benefits

1. **Consistent UX**: Same delete experience in both grid and list views
2. **Clear Feedback**: Users see a modal dialog with clear confirmation message
3. **No Glitching**: Immediate visual feedback when delete is clicked
4. **Better UX**: Standard confirmation pattern that users expect
5. **Code Reuse**: Uses existing dialog component instead of custom overlay

## Testing

After refreshing the page:
1. Click the delete button (trash icon) on any task in list view
2. A confirmation dialog should appear asking "Are you sure you want to delete 1 task?"
3. Click "Delete" to confirm or "Cancel" to abort
4. The task should be deleted immediately after confirmation

The same behavior now works in both grid and list views.
