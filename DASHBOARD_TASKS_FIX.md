# Dashboard Tasks & Activities Fix

## Root Cause Identified
The dashboard couldn't display tasks and activities due to TWO issues:

### Error
```
Error loading dashboard data: Error: Failed to fetch tasks: Unauthorized
at Object.getTasks (task.api.ts:46:13)
```

## Problem Analysis

### Issue 1: Missing Firestore Rules ✅ FIXED
The `tasks` collection had no security rules defined in `firestore.rules`.

### Issue 2: Wrong SDK in API Route ✅ FIXED
The `/api/tasks` route was using the CLIENT SDK (`roleManagementService` and `nonRecurringTaskService`) instead of the ADMIN SDK.

**Why this matters:**
- API routes run SERVER-SIDE in Next.js
- Server-side code MUST use Firebase Admin SDK
- Client SDK doesn't have the necessary permissions to access Firestore from the server
- This caused "Unauthorized" errors even after fixing the rules

## Solution Applied

### 1. Added Firestore Rules for `tasks` Collection
Added role-based access rules in `firestore.rules`:

```javascript
// NON-RECURRING TASKS (Dashboard Tasks)
match /tasks/{taskId} {
  // Managers/Admins can read all tasks
  // Employees can only read tasks assigned to them
  allow read: if isAuthenticated() && (
    isManager() || 
    (isEmployee() && request.auth.uid in resource.data.assignedTo)
  );
  // Only managers can create/update/delete tasks
  allow create, update, delete: if isManager();
}
```

### 2. Updated firebase.json
Added Firestore configuration:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

### 3. Created Admin Service
Created `src/services/nonrecurring-task-admin.service.ts` that uses Firebase Admin SDK for server-side operations.

### 4. Fixed API Route
Updated `src/app/api/tasks/route.ts` to:
- Use `admin.auth().verifyIdToken()` for proper token verification
- Use `adminDb` to query Firestore with Admin SDK
- Use `nonRecurringTaskAdminService` instead of client service

### 5. Deployed Rules
```bash
firebase deploy --only firestore
```

## How It Works Now

### Authentication Flow:
1. Client sends request with Firebase ID token
2. Server verifies token using Admin SDK (`admin.auth().verifyIdToken()`)
3. Server reads user profile from Firestore using Admin SDK
4. Server checks user role and filters tasks accordingly
5. Returns appropriate data based on permissions

### For Managers/Admins:
- Can read ALL tasks
- Can create, update, and delete tasks
- Dashboard shows all tasks and activities

### For Employees:
- Can only read tasks where their user ID is in `assignedTo` array
- Cannot create, update, or delete tasks
- Dashboard shows only their assigned tasks

## Next Steps
1. **Restart your dev server** - Stop and restart `npm run dev`
2. **Hard refresh the browser** - `Ctrl + Shift + R`
3. **Check the console** - Should see no more "Unauthorized" errors
4. **Verify tasks load** - Dashboard should display tasks and activities

## Files Modified
- ✅ `firestore.rules` - Added `tasks` collection rules
- ✅ `firebase.json` - Added Firestore configuration
- ✅ `src/app/api/tasks/route.ts` - Fixed to use Admin SDK
- ✅ `src/services/nonrecurring-task-admin.service.ts` - Created new admin service

## Environment Variables Required
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY` - Already configured in `.env.local`

