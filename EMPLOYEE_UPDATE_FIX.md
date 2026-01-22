# Employee Update Fix

## Issue
Unable to update employees on the employees page (http://localhost:3000/employees).

## Root Causes

### 1. Password Required for Updates
The form schema required password fields even when editing existing employees, which prevented updates.

### 2. Data Overwriting
When updating, the code was overwriting existing employee data (like hireDate, department, etc.) with default values instead of preserving them.

## Fixes Applied

### 1. Made Password Optional (`src/components/employees/EmployeeModal.tsx`)
- Changed password fields from required to optional in the schema
- Added custom validation in `handleFormSubmit` to check password only for new employees
- Password validation:
  - Required for new employees (min 6 characters)
  - Optional for editing existing employees
  - Passwords must match when provided

### 2. Preserved Existing Data (`src/app/employees/page.tsx`)
Updated `handleSubmitEmployee` to:
- **When Editing**: Preserve existing employee data
  - Keep existing `department`
  - Keep existing `hireDate`
  - Keep existing `managerId`
  - Keep existing `teamIds`
  - Keep existing `avatarUrl` (unless new one uploaded)
  - Only update: name, email, phone, role, status

- **When Creating**: Use default values
  - Set `department` to "General"
  - Set `hireDate` to current date
  - Set `managerId` to undefined
  - Set `teamIds` to empty array

## Changes Made

### File: `src/components/employees/EmployeeModal.tsx`

**Before:**
```typescript
password: z.string().min(6, 'Password must be at least 6 characters'),
confirmPassword: z.string(),
```

**After:**
```typescript
password: z.string().optional(),
confirmPassword: z.string().optional(),
```

**Added Validation:**
```typescript
// Validate password for new employees
if (!employee) {
  if (!data.password || data.password.length < 6) {
    alert('Password is required and must be at least 6 characters for new employees');
    return;
  }
  if (data.password !== data.confirmPassword) {
    alert('Passwords do not match');
    return;
  }
}
```

### File: `src/app/employees/page.tsx`

**Before:**
```typescript
const employeeData = {
  // Same data for both create and update
  hireDate: new Date(), // Always overwrites!
  department: 'General', // Always overwrites!
  // ...
};

if (editingEmployee) {
  await updateEmployee(editingEmployee.id!, employeeData);
} else {
  await createEmployee(employeeData, data.password || '');
}
```

**After:**
```typescript
if (editingEmployee) {
  // Update - preserve existing data
  const employeeData = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    status: data.status,
    // Preserve existing
    department: editingEmployee.department,
    hireDate: editingEmployee.hireDate,
    managerId: editingEmployee.managerId,
    teamIds: editingEmployee.teamIds,
    avatarUrl: data.avatar ? URL.createObjectURL(data.avatar) : editingEmployee.avatarUrl,
  };
  await updateEmployee(editingEmployee.id!, employeeData);
} else {
  // Create - use defaults
  const employeeData = {
    employeeId: data.employeeId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    position: data.role || 'Employee',
    department: 'General',
    hireDate: new Date(),
    // ...
  };
  await createEmployee(employeeData, data.password || '');
}
```

## How It Works Now

### Creating a New Employee:
1. Fill in all required fields including password
2. Password must be at least 6 characters
3. Confirm password must match
4. Employee is created with default values for department and hire date

### Editing an Existing Employee:
1. Password fields are hidden (not shown in form)
2. Can update: Name, Email, Phone, Role, Status
3. Existing data is preserved: Department, Hire Date, Manager, Teams
4. No password validation required
5. Employee is updated successfully

## Testing

### To Test Create:
1. Go to http://localhost:3000/employees
2. Click "Add New Employee"
3. Fill in: Employee ID, Name, Email, Phone, Role
4. Enter Password and Confirm Password
5. Click "Create Employee"
6. ✅ Should create successfully

### To Test Update:
1. Go to http://localhost:3000/employees
2. Click "Edit" on any employee
3. Update: Name, Email, Phone, or Role
4. Click "Update Employee"
5. ✅ Should update successfully without password
6. ✅ Existing data (department, hire date) should be preserved

## Benefits

### For Users:
- ✅ Can now update employees without password
- ✅ Existing employee data is preserved
- ✅ No accidental data loss
- ✅ Simpler update process

### For Data Integrity:
- ✅ Hire dates remain accurate
- ✅ Department assignments preserved
- ✅ Manager relationships maintained
- ✅ Team memberships intact

## Notes

- Password is only required when creating new employees
- When editing, password fields are not shown
- All existing employee data is preserved during updates
- Only the fields shown in the form are updated
- Avatar can be updated by uploading a new image

---

**Status:** ✅ Employee update functionality fixed and working
