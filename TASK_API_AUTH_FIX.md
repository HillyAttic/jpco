# Task API Authentication Fix

## Problem
The task API was returning 401 Unauthorized errors because it wasn't sending the Firebase authentication token with requests.

## Error Message
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
Error: Failed to fetch tasks: Unauthorized
```

## Root Cause
The `src/services/task.api.ts` file was making API calls without including the Authorization header with the Firebase ID token.

## Solution
Updated `task.api.ts` to:
1. Import Firebase auth
2. Create a `getAuthHeaders()` helper function
3. Get the current user's ID token
4. Include the token in all API requests

## Changes Made

### Added Authentication Helper
```typescript
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
```

### Updated All API Methods
All methods now include authentication headers:
- `getTasks()` - Fetch tasks with filters
- `getTaskById()` - Fetch single task
- `createTask()` - Create new task
- `updateTask()` - Update existing task
- `deleteTask()` - Delete task
- `addComment()` - Add comment to task
- `getComments()` - Get task comments

## How It Works

### Request Flow
1. User makes API call (e.g., `taskApi.getTasks()`)
2. `getAuthHeaders()` is called
3. Gets current Firebase user
4. Retrieves fresh ID token
5. Adds token to Authorization header
6. Makes authenticated request to API

### API Route Processing
1. API receives request with Authorization header
2. Extracts Bearer token
3. Decodes JWT to get user ID
4. Fetches user profile to check role
5. Filters tasks based on role
6. Returns filtered results

## Security Benefits

### Before (Insecure):
- ❌ No authentication on API calls
- ❌ Anyone could access API endpoints
- ❌ No user identification
- ❌ No role-based filtering

### After (Secure):
- ✅ All requests authenticated
- ✅ User identity verified
- ✅ Role-based access control
- ✅ Proper authorization flow

## Testing

### To Verify the Fix:
1. **Login to the application**
2. **Go to dashboard** (`/dashboard`)
3. **Check browser console** - Should see:
   - No 401 errors
   - Tasks loading successfully
   - Role-based filtering logs

4. **Go to tasks page** (`/tasks/non-recurring`)
5. **Verify**:
   - Tasks load without errors
   - Employees see only their tasks
   - Admins/Managers see all tasks

### Expected Console Output:
```
Employee {userId} filtered tasks: 5
// or
Admin/Manager {userId} viewing all tasks: 50
```

## Error Handling

### If User Not Authenticated:
```
Error: User not authenticated
```
- User will be redirected to login page
- Auth wrapper handles this automatically

### If Token Expired:
- Firebase automatically refreshes token
- `getIdToken()` returns fresh token
- Request succeeds with new token

### If API Returns Error:
- Error message includes status text
- Logged to console for debugging
- User sees appropriate error message

## Related Files

### Modified:
- `src/services/task.api.ts` - Added authentication

### Related (No Changes):
- `src/app/api/tasks/route.ts` - API route with role filtering
- `src/app/api/recurring-tasks/route.ts` - API route with role filtering
- `src/hooks/use-tasks.ts` - Uses task.api.ts
- `src/app/dashboard/page.tsx` - Calls task.api.ts

## Performance Notes

### Token Caching:
- Firebase caches ID tokens
- `getIdToken()` returns cached token if valid
- Only refreshes when expired
- Minimal performance impact

### Request Overhead:
- Each request includes ~1KB token
- Negligible impact on performance
- Standard practice for authenticated APIs

## Future Enhancements

Potential improvements:
1. Add token refresh retry logic
2. Implement request interceptor
3. Add request caching
4. Add offline queue for failed requests
5. Add request timeout handling

## Deployment Notes

### No Breaking Changes:
- Backward compatible
- Existing functionality preserved
- Only adds authentication

### Requirements:
- User must be logged in
- Firebase auth must be initialized
- Valid Firebase project configuration

## Summary

The task API now properly authenticates all requests using Firebase ID tokens. This enables:
- ✅ Secure API access
- ✅ User identification
- ✅ Role-based filtering
- ✅ Proper authorization

Users will no longer see 401 Unauthorized errors, and the role-based task filtering will work correctly.
