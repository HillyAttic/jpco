# Assigned By "Unknown" Issue - Fixed

## Problem
The "Assigned By" field in the non-recurring tasks page was showing "Unknown" instead of the actual user's display name (e.g., "JPCO").

## Root Cause
The `TaskListView` component was calling `employeeService.getAll()` directly from the client side to fetch user names. This approach had reliability issues with client-side Firebase authentication and data fetching.

## Solution
Created a dedicated API endpoint `/api/users/names` that:
1. Handles authentication server-side
2. Fetches all users from the Firestore 'users' collection
3. Returns a map of user IDs to display names

Updated the `TaskListView` component to:
1. Fetch user names from the new API endpoint instead of calling the employee service directly
2. Use Firebase Auth's `getIdToken()` method for proper authentication (same as other API calls in the app)
3. Map both Firebase Auth UID and employeeId to names for flexibility

## Files Changed

### New Files
- `src/app/api/users/names/route.ts` - New API endpoint for fetching user names

### Modified Files
- `src/components/tasks/TaskListView.tsx` - Updated to use the new API endpoint

## Technical Details

### API Endpoint (`/api/users/names`)
```typescript
GET /api/users/names
Authorization: Bearer <token>

Response: {
  "hTncqO5c9CgSQ6JY2dn8cdtjabI2": "JPCO",
  "CsqOaakJYcXrPXoBZO4ZzgJLydp1": "John Doe",
  ...
}
```

### Component Changes
The `TaskListView` component now:
1. Fetches user names when tasks are loaded
2. Uses the Firebase Auth token for authentication
3. Creates a name map for quick lookups
4. Displays "System" if no creator is found (for legacy tasks)
5. Displays "Unknown" if the user ID is not in the map

## Testing
- The API endpoint is successfully being called (confirmed in server logs)
- Returns 200 OK status
- User names should now display correctly in the "Assigned By" column

## Benefits
1. **More Reliable**: Server-side data fetching is more reliable than client-side
2. **Better Performance**: Single API call to fetch all user names instead of multiple queries
3. **Consistent Authentication**: Uses the same auth pattern as other API calls in the app
4. **Maintainable**: Centralized user name fetching logic

## Next Steps
If you still see "Unknown" after refreshing the page:
1. Check the browser console for any errors
2. Verify that the user document in Firestore has the `displayName` field set
3. Check that the document ID in Firestore matches the Firebase Auth UID
