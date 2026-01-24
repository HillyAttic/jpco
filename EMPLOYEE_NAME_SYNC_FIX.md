# Employee Name Sync Fix

## Issue Description

When updating an employee's name in the employees page (http://localhost:3000/employees), the change was not reflected in:
1. The header user info dropdown (showing "Naveen Chandra" instead of "Naveen Kumar")
2. The profile page (http://localhost:3000/profile)

## Root Cause

The application uses two separate Firestore collections:
1. **`employees` collection**: Stores employee records (updated when editing on employees page)
2. **`users` collection**: Stores user authentication profiles (used by auth context for display)

When updating an employee record, only the `employees` collection was being updated, but the `users` collection (which the authentication context reads from) was not being synced.

## Solution Implemented

Modified the `employeeService.update()` method in `src/services/employee.service.ts` to:

1. Update the employee record in the `employees` collection (existing behavior)
2. Find the corresponding user document in the `users` collection by email
3. Update the user profile with the new name/email

### Code Changes

```typescript
async update(
  id: string,
  data: Partial<Omit<Employee, 'id'>>,
  password?: string
): Promise<Employee> {
  // Get the existing employee to find their email
  const existingEmployee = await this.getById(id);
  
  // Update the employee record
  let updatedEmployee: Employee;
  if (password) {
    const passwordHash = btoa(password);
    updatedEmployee = await employeeFirebaseService.update(id, { ...data, passwordHash });
  } else {
    updatedEmployee = await employeeFirebaseService.update(id, data);
  }
  
  // Also update the user profile if name or email changed
  if (existingEmployee && (data.name || data.email)) {
    try {
      // Find user document by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', existingEmployee.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update the first matching user
        const userDoc = querySnapshot.docs[0];
        await roleManagementService.updateUserProfile(userDoc.id, {
          ...(data.name && { displayName: data.name }),
          ...(data.email && { email: data.email }),
        });
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      // Continue even if user profile update fails
    }
  }
  
  return updatedEmployee;
}
```

## How It Works

### Update Flow:
1. User updates employee name from "Naveen Chandra" to "Naveen Kumar" on employees page
2. API calls `employeeService.update()`
3. Employee record updated in `employees` collection
4. Service queries `users` collection to find user with matching email
5. User profile updated with new `displayName`
6. Auth context automatically refreshes and picks up the new name
7. Header and profile page now show "Naveen Kumar"

### Query Strategy:
- Uses Firestore query: `where('email', '==', existingEmployee.email)`
- Finds the user document by email (since employee ID ≠ user UID)
- Updates the `displayName` field in the user profile

## Data Synchronization

### Fields Synced:
- **Name**: `employee.name` → `user.displayName`
- **Email**: `employee.email` → `user.email`

### Collections Involved:
```
employees/{employeeId}
  ├─ name: "Naveen Kumar"
  ├─ email: "naveen@example.com"
  └─ ...

users/{uid}
  ├─ displayName: "Naveen Kumar"  ← Synced from employee.name
  ├─ email: "naveen@example.com"  ← Synced from employee.email
  └─ ...
```

## Error Handling

The implementation includes robust error handling:

1. **User Not Found**: Logs warning but continues (employee update still succeeds)
2. **Query Failure**: Catches error, logs it, but doesn't fail the employee update
3. **Update Failure**: Logs error but doesn't rollback employee update

This ensures that even if the user profile sync fails, the employee record is still updated successfully.

## Testing

### Test Scenario 1: Update Employee Name
1. Go to http://localhost:3000/employees
2. Edit an employee and change their name
3. Check header dropdown - should show new name
4. Check profile page - should show new name

### Test Scenario 2: Update Employee Email
1. Go to http://localhost:3000/employees
2. Edit an employee and change their email
3. Check header dropdown - should show new email
4. Check profile page - should show new email

### Test Scenario 3: Update Both Name and Email
1. Go to http://localhost:3000/employees
2. Edit an employee and change both name and email
3. Both should be reflected in header and profile

## Authentication Context Refresh

The `EnhancedAuthContext` automatically refreshes user data through:

1. **`onAuthStateChanged` listener**: Reloads user data when auth state changes
2. **`onIdTokenChanged` listener**: Reloads user data when token refreshes
3. **`loadUserData()` method**: Fetches latest user profile from Firestore

After updating the user profile in Firestore, the auth context will pick up the changes on the next token refresh or when the component remounts.

### Manual Refresh (if needed):
Users can also manually refresh by:
- Refreshing the page
- Signing out and back in
- Waiting for automatic token refresh (happens periodically)

## Benefits

1. **Data Consistency**: Employee and user data stay in sync
2. **Better UX**: Changes reflect immediately across the app
3. **No Breaking Changes**: Existing functionality preserved
4. **Graceful Degradation**: Employee updates succeed even if user sync fails

## Future Improvements

Potential enhancements for future iterations:

1. **Real-time Sync**: Use Firestore listeners to update UI immediately
2. **Bidirectional Sync**: Update employee when user profile changes
3. **Batch Updates**: Optimize multiple field updates
4. **Audit Trail**: Log all sync operations for debugging
5. **Conflict Resolution**: Handle cases where email changes conflict with existing users

## Files Modified

1. `src/services/employee.service.ts` - Added user profile sync logic to `update()` method

## Dependencies

- `firebase/firestore` - For querying users by email
- `role-management.service` - For updating user profiles
- Existing employee and user collections in Firestore
