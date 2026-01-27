# Tasks Role-Based Filtering Implementation

## Overview
Fixed the critical security issue where all users could see all tasks regardless of assignment. Now employees only see tasks assigned to them, while admins and managers see all tasks.

## The Problem
**Before:** When an admin created tasks and assigned them to employees, ALL users (including those not assigned) could see ALL tasks in the system at:
- `/tasks/non-recurring`
- `/tasks/recurring`

This was a major privacy and security issue.

## The Solution
Implemented role-based filtering at the API level to ensure:
- **Employees**: Only see tasks where they are in the `assignedTo` array (non-recurring) or `contactIds` array (recurring)
- **Admins/Managers**: See all tasks in the system

## Changes Made

### 1. Non-Recurring Tasks API (`src/app/api/tasks/route.ts`)

**Enhanced GET endpoint with:**
- Authentication token verification
- User role detection
- Task filtering based on role

```typescript
// Filter tasks based on user role
if (!isAdminOrManager) {
  // Employees only see tasks assigned to them
  tasks = tasks.filter(task => {
    if (!task.assignedTo || !Array.isArray(task.assignedTo)) {
      return false;
    }
    return task.assignedTo.includes(userId);
  });
}
```

### 2. Recurring Tasks API (`src/app/api/recurring-tasks/route.ts`)

**Added complete role-based filtering:**
- Authentication token verification
- User role detection  
- Task filtering based on `contactIds` array

```typescript
// Filter tasks based on user role
if (!isAdminOrManager) {
  // Employees only see tasks assigned to them
  tasks = tasks.filter(task => {
    if (!task.contactIds || !Array.isArray(task.contactIds)) {
      return false;
    }
    return task.contactIds.includes(userId);
  });
}
```

### 3. Added Logging
Both APIs now log filtering activity for debugging:
- Employee filtering: Shows how many tasks an employee can see
- Admin/Manager access: Shows total tasks being viewed

## How It Works

### Authentication Flow
1. Client sends request with Bearer token in Authorization header
2. Server verifies token using Firebase Admin SDK
3. Server extracts user ID from token
4. Server fetches user profile to determine role

### Filtering Logic

#### For Employees:
```
1. Fetch all tasks from database
2. Filter to only tasks where:
   - Non-recurring: user.uid is in task.assignedTo array
   - Recurring: user.uid is in task.contactIds array
3. Return filtered list
```

#### For Admins/Managers:
```
1. Fetch all tasks from database
2. Return complete list (no filtering)
```

## Security Benefits

### Before (Insecure):
- ❌ Employee A could see tasks assigned to Employee B
- ❌ Employees could see all company tasks
- ❌ No privacy for task assignments
- ❌ Potential data leakage

### After (Secure):
- ✅ Employees only see their own tasks
- ✅ Task assignments are private
- ✅ Role-based access control enforced
- ✅ Admins/Managers maintain oversight

## Testing

### Test as Employee:
1. Login with employee account
2. Go to `/tasks/non-recurring`
3. Should only see tasks assigned to you
4. Should NOT see tasks assigned to other employees

### Test as Admin/Manager:
1. Login with admin or manager account
2. Go to `/tasks/non-recurring`
3. Should see ALL tasks in the system
4. Can see tasks assigned to any employee

### Test Task Assignment:
1. Admin creates task and assigns to Employee A
2. Employee A logs in → sees the task
3. Employee B logs in → does NOT see the task
4. Admin logs in → sees the task

## API Endpoints Affected

### Non-Recurring Tasks
- **GET** `/api/tasks` - Now filters by role
- **POST** `/api/tasks` - No changes (creation allowed)
- **PUT** `/api/tasks/:id` - No changes (update allowed)
- **DELETE** `/api/tasks/:id` - No changes (deletion allowed)

### Recurring Tasks
- **GET** `/api/recurring-tasks` - Now filters by role
- **POST** `/api/recurring-tasks` - No changes (creation allowed)
- **PUT** `/api/recurring-tasks/:id` - No changes (update allowed)
- **DELETE** `/api/recurring-tasks/:id` - No changes (deletion allowed)

## Data Structure

### Non-Recurring Tasks
```typescript
{
  id: string;
  title: string;
  assignedTo: string[]; // Array of user IDs
  // ... other fields
}
```

### Recurring Tasks
```typescript
{
  id: string;
  title: string;
  contactIds: string[]; // Array of user IDs
  // ... other fields
}
```

## Error Handling

### Authentication Errors:
- Missing token → 401 Unauthorized
- Invalid token → 401 Unauthorized
- User profile not found → 401 Unauthorized

### Authorization:
- Employees automatically filtered (no error)
- Admins/Managers see all (no filtering)

## Performance Considerations

### Current Implementation:
- Fetches all tasks from database
- Filters in memory based on role
- Simple and effective for small to medium datasets

### Future Optimization (if needed):
- Add database-level filtering
- Use Firestore queries with `where('assignedTo', 'array-contains', userId)`
- Reduce data transfer for large task lists

## Logging

Console logs help with debugging:
```
Employee {userId} filtered tasks: 5
Admin/Manager {userId} viewing all tasks: 50
```

## Future Enhancements

Potential improvements:
1. Add task creation permissions (only admins/managers can create)
2. Add task edit permissions (only creator or assignee can edit)
3. Add task delete permissions (only creator or admin can delete)
4. Add audit logging for task access
5. Add rate limiting for API endpoints
6. Add caching for user roles

## Migration Notes

### No Database Changes Required
- Existing tasks work as-is
- No data migration needed
- Backward compatible

### Deployment Steps
1. Deploy updated API routes
2. Clear any client-side caches
3. Test with different user roles
4. Monitor logs for any issues

## Compliance

This implementation ensures:
- ✅ Data privacy (employees can't see others' tasks)
- ✅ Role-based access control (RBAC)
- ✅ Principle of least privilege
- ✅ Audit trail (via logging)
- ✅ Secure by default

## Summary

The task filtering is now properly implemented at the API level, ensuring that employees only see tasks assigned to them while admins and managers maintain full visibility. This fixes the critical security issue where all users could see all tasks regardless of assignment.
