# ARN Name Field Fix - Summary

## Issues Fixed

### 1. ✅ Name Field Shows Email Instead of Name
**Problem**: The ARN dialog was showing the user's email address instead of their display name.

**Solution**: Updated to use `userProfile.displayName` which contains the actual user's name from their profile.

**Code Change**:
```typescript
// Before
const userName = user?.displayName || user?.email || '';

// After
const userName = userProfile?.displayName || user?.displayName || user?.email || '';
```

**Priority Order**:
1. `userProfile.displayName` - User's actual name from profile (e.g., "John Doe")
2. `user.displayName` - Firebase Auth display name (fallback)
3. `user.email` - Email address (last resort)

### 2. ✅ Name Field is Editable
**Problem**: Users could edit the name field, which should be read-only.

**Solution**: Made the name field read-only and disabled with visual indication.

**Code Change**:
```tsx
// Before
<input
  value={arnName}
  onChange={(e) => setArnName(e.target.value)}
  placeholder="Enter your name"
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
/>

// After
<input
  value={arnName}
  readOnly
  disabled
  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
/>
```

**Visual Changes**:
- Gray background (`bg-gray-100`)
- Gray text (`text-gray-700`)
- Not-allowed cursor (`cursor-not-allowed`)
- Added helper text: "Name is automatically filled from your profile"

### 3. ✅ Changed "Authorization" to "Application"
**Problem**: Label said "Authorization Reference Number" but should be "Application Reference Number".

**Solution**: Updated the label text in the recurring task form.

**Code Change**:
```tsx
// Before
Enable ARN (Authorization Reference Number)

// After
Enable ARN (Application Reference Number)
```

## Files Modified

1. **src/components/recurring-tasks/RecurringTaskModal.tsx**
   - Changed label from "Authorization" to "Application"

2. **src/components/recurring-tasks/RecurringTaskClientModal.tsx**
   - Added `userProfile` from `useEnhancedAuth()`
   - Updated name resolution to use `userProfile.displayName` first
   - Made name input field read-only and disabled
   - Added helper text below name field
   - Added debug logging for user info

## Testing

### Test 1: Verify Name Shows Correctly
1. Go to http://localhost:3000/calendar
2. Click on a task with ARN enabled
3. Click a checkbox
4. ARN dialog should show your **name** (not email)
5. Check browser console for debug log:
   ```
   [ARN Debug] User info: {
     profileDisplayName: "John Doe",  👈 Should show actual name
     userDisplayName: "...",
     email: "user@example.com",
     userName: "John Doe"  👈 This is what's displayed
   }
   ```

### Test 2: Verify Name is Read-Only
1. In the ARN dialog, try to click on the name field
2. Field should be grayed out
3. Cursor should show "not-allowed" icon
4. Cannot type or edit the name
5. Helper text should say: "Name is automatically filled from your profile"

### Test 3: Verify Label Text
1. Go to http://localhost:3000/tasks/recurring
2. Click "Create New Recurring Task"
3. Scroll to bottom
4. Label should say: "Enable ARN (Application Reference Number)"
5. NOT "Authorization"

## Expected Behavior

### ARN Dialog Appearance:
```
┌──────────────────────────────────────┐
│ ARN Required                         │
│                                      │
│ ARN Number *                         │
│ [_______________] 0/15 digits        │
│                                      │
│ Your Name *                          │
│ [John Doe       ] 🔒 (grayed out)   │
│ Name is automatically filled from    │
│ your profile                         │
│                                      │
│ [Cancel]  [Submit]                   │
└──────────────────────────────────────┘
```

### Name Field States:
- ✅ Shows actual name (not email)
- ✅ Gray background
- ✅ Cannot be clicked
- ✅ Cannot be edited
- ✅ Shows not-allowed cursor
- ✅ Has helper text

## Troubleshooting

### If Email Still Shows Instead of Name:

**Check 1: User Profile Has Display Name**
1. Open Firebase Console
2. Go to Firestore Database
3. Find `users` collection
4. Find your user document
5. Check if `displayName` field exists and has a value
6. If missing or empty, that's the issue

**Solution**: Update user profile with display name:
```typescript
// In Firebase Console or through code
{
  uid: "user-id",
  email: "user@example.com",
  displayName: "John Doe",  👈 Make sure this exists
  role: "employee",
  ...
}
```

**Check 2: Console Logs**
Look at the debug log:
```
[ARN Debug] User info: {
  profileDisplayName: undefined,  👈 If undefined, profile doesn't have name
  userDisplayName: undefined,
  email: "user@example.com",
  userName: "user@example.com"  👈 Falls back to email
}
```

### If Name Field is Still Editable:

**Check**: Make sure you hard-refreshed the page (Ctrl+Shift+R)

**Verify**: Inspect the input element in browser DevTools:
- Should have `readonly` attribute
- Should have `disabled` attribute
- Should have `bg-gray-100` class

## Summary

All three issues have been fixed:
1. ✅ Name field now shows user's display name (not email)
2. ✅ Name field is read-only and cannot be edited
3. ✅ Label changed from "Authorization" to "Application"

The ARN dialog now properly displays the user's name from their profile and prevents editing.
