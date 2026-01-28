# Recurring Tasks Cache Fix

## Problem
Recurring tasks were disappearing from the page (http://localhost:3000/tasks/recurring) after a page refresh, even though they were visible in the Firestore database under the `/recurring-tasks/` collection.

## Root Cause
Firestore was using cached data by default. When the page refreshed, it would show stale or incomplete cached data instead of fetching fresh data from the server. This caused tasks to appear to "vanish" even though they existed in the database.

## Solution
Updated the Firebase service to force server-side data fetching for recurring tasks, bypassing the cache entirely.

### Changes Made

1. **Updated `src/services/firebase.service.ts`**:
   - Added `getDocsFromServer` import from Firebase Firestore
   - Added `forceServerFetch` option to `QueryOptions` interface
   - Modified `getAll()` method to use `getDocsFromServer` when `forceServerFetch` is true
   - Modified `getPaginated()` method to support `forceServerFetch` option

2. **Updated `src/services/recurring-task.service.ts`**:
   - Modified `getAll()` method to always set `forceServerFetch: true`
   - This ensures recurring tasks are always fetched from the server, not from cache

## How It Works

- **Before**: `getDocs(query)` → Uses cache first, may show stale data
- **After**: `getDocsFromServer(query)` → Always fetches from server, ensures fresh data

## Testing

1. Navigate to http://localhost:3000/tasks/recurring
2. Verify recurring tasks are displayed
3. Refresh the page (F5 or Ctrl+R)
4. Verify recurring tasks remain visible after refresh
5. Check that tasks match what's in the Firestore database

## Benefits

- ✅ Recurring tasks always show fresh data from Firestore
- ✅ No more disappearing tasks on page refresh
- ✅ Consistent data display across sessions
- ✅ Cache issues eliminated for recurring tasks

## Note

This fix specifically targets recurring tasks. Other collections still use the default caching behavior, which is appropriate for most use cases. If similar issues occur with other collections, the same `forceServerFetch: true` option can be applied.
