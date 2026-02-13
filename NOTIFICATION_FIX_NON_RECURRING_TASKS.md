# Notification Fix for Non-Recurring Tasks

## Problem Diagnosed

Cloud functions were not triggering notifications when tasks were assigned to regular users due to:

1. **Missing `NEXT_PUBLIC_APP_URL` environment variable** - The task creation/update APIs used `fetch()` to call `/api/notifications/send` internally, but the URL defaulted to `http://localhost:3000` in production, causing silent failures.

2. **Unreliable server-side self-referencing `fetch()`** - Using `fetch()` to call internal API routes from server-side code is problematic on serverless platforms (cold starts, timeouts, network overhead).

3. **Silent error handling** - Errors were caught and logged but not surfaced, making it hard to detect notification failures.

## Solution Implemented

### 1. Created Shared Notification Utility

**File:** `src/lib/notifications/send-notification.ts`

- Extracted notification logic into a reusable function
- Sends FCM push notifications directly via Admin SDK
- Stores notifications in Firestore for history
- Returns detailed results (sent/errors)
- No network overhead or URL dependencies

### 2. Updated Task Creation API

**File:** `src/app/api/tasks/route.ts`

**Changes:**
- Imported `sendNotification` utility
- Replaced `fetch()` call with direct function call
- Improved logging with detailed success/error reporting
- Eliminated `NEXT_PUBLIC_APP_URL` dependency

**Before:**
```typescript
const notificationResponse = await fetch(
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`,
  { method: 'POST', ... }
);
```

**After:**
```typescript
const result = await sendNotification({
  userIds: taskData.assignedTo,
  title: 'New Task Assigned',
  body: `You have been assigned a new task: ${taskData.title}`,
  data: { taskId: newTask.id, url: '/tasks', type: 'task_assigned' },
});
```

### 3. Updated Task Update API

**File:** `src/app/api/tasks/[id]/route.ts`

**Changes:**
- Imported `sendNotification` utility
- Replaced `fetch()` call with direct function call
- Only notifies newly assigned users (not existing assignees)
- Improved logging

### 4. Refactored Notification Send API

**File:** `src/app/api/notifications/send/route.ts`

**Changes:**
- Now uses the shared `sendNotification` utility
- Reduced code duplication
- Maintains backward compatibility for external callers

## Benefits

✅ **Eliminates URL dependency** - No need for `NEXT_PUBLIC_APP_URL`  
✅ **Faster execution** - No network overhead from internal `fetch()`  
✅ **More reliable** - Direct function calls can't fail due to network issues  
✅ **Better error handling** - Detailed logging of sent/failed notifications  
✅ **DRY principle** - Single source of truth for notification logic  
✅ **Production-ready** - Works reliably on Vercel and other serverless platforms  

## Testing

### Test Task Creation with Notifications

1. Create a new non-recurring task via `/api/tasks` (POST)
2. Assign it to one or more users
3. Check server logs for:
   ```
   [Task API] Sending notifications to X user(s): [userId1, userId2]
   [sendNotification] ✅ FCM sent to userId1 in XXms
   [Task API] ✅ Notification result: { totalTime: 'XXms', sent: X, errors: 0 }
   ```

### Test Task Update with Notifications

1. Update an existing task via `/api/tasks/[id]` (PUT)
2. Add new assignees
3. Check server logs for:
   ```
   [Task Update API] Sending notifications to X newly assigned user(s): [userId]
   [sendNotification] ✅ FCM sent to userId in XXms
   ```

### Verify Notification Delivery

1. Check user's device for push notification
2. Check Firestore `notifications` collection for new documents with:
   - `sent: true`
   - `sentDirect: true`
   - `sentAt: [timestamp]`

## What Was NOT Changed

- **Recurring tasks** - As requested, no notification logic was added to recurring tasks
- **Cloud Function** - The `sendPushNotification` cloud function remains unchanged (it's redundant but harmless)
- **Client-side code** - No changes to React components or hooks
- **Firestore rules** - No security rule changes needed

## Deployment Notes

1. **No environment variables needed** - The fix eliminates the need for `NEXT_PUBLIC_APP_URL`
2. **No database migrations** - Firestore schema remains unchanged
3. **Backward compatible** - External callers to `/api/notifications/send` still work
4. **Deploy and test** - Simply deploy the updated code and test task creation

## Files Modified

1. ✅ `src/lib/notifications/send-notification.ts` (NEW)
2. ✅ `src/app/api/tasks/route.ts` (UPDATED)
3. ✅ `src/app/api/tasks/[id]/route.ts` (UPDATED)
4. ✅ `src/app/api/notifications/send/route.ts` (REFACTORED)

## Next Steps

1. Deploy the changes to production
2. Test task creation with user assignments
3. Monitor server logs for notification success/failure
4. If needed, add notification logic to recurring tasks using the same pattern
