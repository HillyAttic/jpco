# Password Update Feature for Employee Edit - Complete

## Summary
Added the ability to update employee passwords when editing an existing employee. The password field is now optional during edit mode, allowing admins to change passwords without requiring other field updates.

## Changes Made

### 1. EmployeeModal Component (`src/components/employees/EmployeeModal.tsx`)
**Changes:**
- Removed conditional rendering that hid password fields during edit mode
- Password fields now always visible for both create and edit modes
- Updated labels:
  - Create mode: "Password" / "Confirm Password"
  - Edit mode: "New Password (optional)" / "Confirm New Password"
- Added helper text: "Leave blank to keep current password"
- Updated validation logic:
  - Create mode: Password required, minimum 6 characters
  - Edit mode: Password optional, but if provided must be minimum 6 characters
  - Both modes: Passwords must match if provided

### 2. Employee Service (`src/services/employee.service.ts`)
**Changes:**
- Updated `update()` method signature to accept optional password parameter:
  ```typescript
  async update(
    id: string,
    data: Partial<Omit<Employee, 'id'>>,
    password?: string
  ): Promise<Employee>
  ```
- If password provided, hashes it using `btoa()` and includes `passwordHash` in update
- If no password provided, updates other fields without touching password

### 3. useEmployees Hook (`src/hooks/use-employees.ts`)
**Changes:**
- Updated `updateEmployee()` function signature:
  ```typescript
  updateEmployee: (
    id: string, 
    data: Partial<Omit<Employee, 'id'>>, 
    password?: string
  ) => Promise<void>
  ```
- Passes password to API endpoint in request body
- Updated `UseEmployeesReturn` interface to reflect new signature

### 4. Employees Page (`src/app/employees/page.tsx`)
**Changes:**
- Updated `handleSubmitEmployee()` to pass password when updating:
  ```typescript
  await updateEmployee(
    editingEmployee.id!, 
    employeeData, 
    data.password || undefined
  );
  ```
- Password only sent if user enters a value (not empty string)

### 5. API Route (`src/app/api/employees/[id]/route.ts`)
**Changes:**
- Updated PUT endpoint to extract password from request body
- Password extracted before validation (not part of schema)
- Passes password to `employeeService.update()` method
- Password validation handled by service layer

## User Experience

### Creating New Employee
1. All fields required including password
2. Password must be at least 6 characters
3. Password and Confirm Password must match
4. Password is hashed and stored as `passwordHash`

### Editing Existing Employee
1. Password fields visible but optional
2. Helper text: "Leave blank to keep current password"
3. If password left blank: Current password unchanged
4. If password entered:
   - Must be at least 6 characters
   - Must match confirmation
   - Old password replaced with new hashed password

## Security Notes
- Passwords are hashed using `btoa()` (Base64 encoding)
- **Production Recommendation**: Replace `btoa()` with proper bcrypt hashing
- Password never stored in plain text
- Password never returned in API responses (passwordHash field excluded from Employee interface in responses)

## Testing Checklist
✅ Create new employee with password
✅ Edit employee without changing password (leave blank)
✅ Edit employee and update password
✅ Validation: Password too short (< 6 chars)
✅ Validation: Passwords don't match
✅ Password field shows appropriate labels for create/edit modes
✅ Helper text visible in edit mode

## Files Modified
1. `src/components/employees/EmployeeModal.tsx`
2. `src/services/employee.service.ts`
3. `src/hooks/use-employees.ts`
4. `src/app/employees/page.tsx`
5. `src/app/api/employees/[id]/route.ts`

## Related Documentation
- See `EMPLOYEE_DATA_STRUCTURE_SIMPLIFIED.md` for overall employee data structure
- Password hashing currently uses `btoa()` - upgrade to bcrypt recommended for production
