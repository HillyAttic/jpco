# Recurring Tasks 400 Error - Fixed

## Problem
When trying to update a recurring task on http://localhost:3000/tasks/recurring, the API returned a 400 Bad Request error. The console showed:
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
Error submitting recurring task: Error: Bad Request
```

## Root Cause
The validation schema in the API endpoints didn't match the data being sent from the frontend:

1. **Missing fields**: The schema was missing `contactIds`, `categoryId`, and `teamId` fields
2. **Date type mismatch**: The schema only accepted date strings, but the frontend was sending Date objects
3. **Recurrence pattern mismatch**: The schema was missing 'daily' and 'weekly' patterns

## Solution

### Updated PUT /api/recurring-tasks/[id] (Update endpoint)
- Added missing fields: `contactIds`, `categoryId`, `teamId`
- Updated date fields to accept both strings and Date objects using `z.union()`
- Updated date conversion logic to handle both types

### Updated POST /api/recurring-tasks (Create endpoint)
- Added 'daily' and 'weekly' to recurrence pattern enum
- Updated date fields to accept both strings and Date objects
- Updated date conversion logic to handle both types
- Fixed the endDate validation to work with both Date objects and strings

## Changes Made

### File: `src/app/api/recurring-tasks/[id]/route.ts`
- Updated `updateRecurringTaskSchema` to include all fields sent from frontend
- Made date fields accept `z.union([z.string(), z.date()])`
- Updated date conversion to check `instanceof Date` before converting

### File: `src/app/api/recurring-tasks/route.ts`
- Updated `createRecurringTaskSchema` to include 'daily' and 'weekly' patterns
- Made date fields accept both strings and Date objects
- Updated date conversion logic
- Fixed endDate validation to handle both types

## Testing
To verify the fix:
1. Go to http://localhost:3000/tasks/recurring
2. Click "Add Recurring Task" or edit an existing task
3. Fill in the form and submit
4. The task should save successfully without 400 errors
5. Check the console - no more "Bad Request" errors

## Technical Details
The validation now properly handles:
- `contactIds: string[]` - Array of contact IDs
- `categoryId: string` - Category identifier
- `teamId: string` - Team identifier
- Date fields as both `string` (ISO format) and `Date` objects
- All recurrence patterns: 'daily', 'weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'
