# Migration: Employees Collection → Users Collection

## What Changed

The application now uses **ONLY the `/users` collection** for storing employee data. The separate `/employees` collection has been removed to eliminate data synchronization issues.

## Benefits

1. ✅ **No More Sync Issues**: Name changes update immediately everywhere
2. ✅ **Single Source of Truth**: All user/employee data in one place
3. ✅ **Simpler Architecture**: No need to maintain two collections
4. ✅ **Better Performance**: Fewer database queries
5. ✅ **Consistent Data**: Authentication and employee data always match

## Technical Changes

### Before (Two Collections)
```
/employees/{employeeDocId}
  ├─ name: "Naveen Kumar"
  ├─ email: "9318381275@gmail.com"
  └─ ...

/users/{firebaseAuthUID}
  ├─ displayName: "Naveen Chandra"  ← Different!
  ├─ email: "9318381275@gmail.com"
  └─ ...
```

### After (One Collection)
```
/users/{firebaseAuthUID}
  ├─ displayName: "Naveen Kumar"
  ├─ email: "9318381275@gmail.com"
  ├─ employeeId: "EMP026"
  ├─ phoneNumber: "9318381275"
  ├─ role: "employee"
  ├─ status: "active"
  └─ ...
```

## Field Mapping

| Employee Field | Users Field | Notes |
|---------------|-------------|-------|
| `name` | `displayName` | Primary name field |
| `email` | `email` | Same |
| `phone` | `phoneNumber` | Renamed |
| `role` | `role` | Converted (Admin→admin, Manager→manager, Employee→employee) |
| `status` | `isActive` + `status` | active=true, on-leave=false |
| `employeeId` | `employeeId` | Added to users collection |
| `id` | Firebase Auth UID | Now uses auth UID as primary key |

## What You Need to Do

### Step 1: Update Your Current Employee Data

Since you have an employee in `/employees/z0argGXQmlV9uJvFWiRk`, you need to either:

**Option A: Create a new employee through the UI**
1. Go to http://localhost:3000/employees
2. Click "Add Employee"
3. Fill in the details:
   - Employee ID: EMP026
   - Name: Naveen Kumar
   - Email: 9318381275@gmail.com
   - Phone: 9318381275
   - Role: Employee
   - Password: (your password)
4. Save

This will create the employee properly in the `/users` collection with Firebase Auth.

**Option B: Manually update your existing user document**
1. Open Firebase Console
2. Go to Firestore Database
3. Find your user document in `/users` collection (by your email)
4. Add/update these fields:
   ```
   employeeId: "EMP026"
   displayName: "Naveen Kumar"
   phoneNumber: "9318381275"
   status: "active"
   isActive: true
   ```

### Step 2: Delete the Old Employees Collection

Once you've verified everything works:

1. Open Firebase Console
2. Go to Firestore Database
3. Find the `/employees` collection
4. Delete it (or keep it as backup for now)

## How It Works Now

### Creating an Employee
```typescript
// Creates user in Firebase Auth AND /users collection
await employeeService.create({
  employeeId: "EMP027",
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  role: "Employee",
  status: "active"
}, "password123");
```

**Result**: 
- Firebase Auth account created
- User document created in `/users` collection
- All fields stored in one place

### Updating an Employee
```typescript
// Updates user in /users collection
await employeeService.update(userId, {
  name: "Naveen Kumar"
});
```

**Result**:
- User document updated in `/users` collection
- Changes reflect immediately in header, profile, everywhere
- No sync needed!

### Reading Employees
```typescript
// Reads from /users collection
const employees = await employeeService.getAll();
```

**Result**:
- Returns all users as employees
- Maps fields automatically (displayName → name, etc.)

## Testing

### Test 1: Update Employee Name
1. Go to http://localhost:3000/employees
2. Edit your employee
3. Change name to "Naveen Kumar"
4. Save
5. ✅ Check header - should show "Naveen Kumar" immediately
6. ✅ Check profile page - should show "Naveen Kumar"
7. ✅ No refresh needed!

### Test 2: Create New Employee
1. Go to http://localhost:3000/employees
2. Click "Add Employee"
3. Fill in details and save
4. ✅ Employee appears in list
5. ✅ Can sign in with that email/password
6. ✅ Profile shows correct name

### Test 3: Check Firestore
1. Open Firebase Console
2. Go to Firestore Database
3. ✅ Check `/users` collection - should have all employees
4. ✅ Check `/employees` collection - can be deleted (no longer used)

## Troubleshooting

### Issue: "Employee not found" when updating
**Cause**: The employee ID you're using is from the old `/employees` collection
**Solution**: Use the Firebase Auth UID instead (from `/users` collection)

### Issue: Can't see employees in the list
**Cause**: No users in `/users` collection
**Solution**: Create employees through the UI (they'll be added to `/users`)

### Issue: Old employee data still showing
**Cause**: Browser cache
**Solution**: 
1. Click profile picture → "Refresh profile"
2. Or refresh the page (F5)
3. Or clear browser cache

### Issue: Password update doesn't work
**Cause**: Password updates require Firebase Admin SDK
**Solution**: For now, users need to use "Forgot Password" to reset

## Migration Script (Optional)

If you have many employees in `/employees` collection, here's a script to migrate them:

```typescript
// Run this once to migrate data
async function migrateEmployeesToUsers() {
  const employeesSnapshot = await getDocs(collection(db, 'employees'));
  
  for (const empDoc of employeesSnapshot.docs) {
    const empData = empDoc.data();
    
    // Check if user already exists
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', empData.email)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      // Update existing user
      const userDoc = usersSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        employeeId: empData.employeeId,
        displayName: empData.name,
        phoneNumber: empData.phone,
        status: empData.status,
        isActive: empData.status === 'active'
      });
      console.log('Updated user:', empData.email);
    } else {
      console.log('No user found for:', empData.email);
      // You'll need to create Firebase Auth account manually
    }
  }
}
```

## Files Modified

1. `src/services/employee.service.ts` - Complete rewrite to use `/users` collection
2. All employee-related functionality now reads/writes to `/users` only

## Next Steps

1. ✅ Test updating your employee name
2. ✅ Verify it shows correctly everywhere
3. ✅ Create a new test employee
4. ✅ Delete old `/employees` collection (optional, after backup)
5. ✅ Enjoy synchronized data!

## Rollback (If Needed)

If you need to rollback:
1. Restore the old `employee.service.ts` from git history
2. Keep both collections temporarily
3. Manually sync data between them

But with the new system, you shouldn't need to rollback - it's much simpler and more reliable!
