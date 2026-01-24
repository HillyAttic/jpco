# Cache Refresh Fix for Employee Name Updates

## Issue
After updating an employee's name, the changes weren't appearing in the header or profile page due to caching in the authentication context.

## Solutions Implemented

### 1. Added Manual Refresh Function
Added a `refreshUserData()` method to the authentication context that forces a reload of user profile data from Firestore.

**File**: `src/contexts/enhanced-auth.context.tsx`
```typescript
const refreshUserData = useCallback(async () => {
  if (user) {
    await loadUserData(user);
  }
}, [user, loadUserData]);
```

### 2. Added Refresh Button to User Dropdown
Added a "Refresh profile" button in the user dropdown menu that allows manual cache refresh.

**File**: `src/components/Layouts/header/user-info/index.tsx`

**Location**: Click your profile picture/name in the header → "Refresh profile" button

**Features**:
- Shows spinning icon while refreshing
- Disabled state during refresh
- Immediately updates displayed name

### 3. Cache Busting in Employee Update
Added a `lastUpdated` timestamp when updating user profiles to force cache invalidation.

**File**: `src/services/employee.service.ts`
```typescript
await roleManagementService.updateUserProfile(userDoc.id, {
  ...(data.name && { displayName: data.name }),
  ...(data.email && { email: data.email }),
  lastUpdated: new Date() as any, // Force cache bust
});
```

## How to Use

### Method 1: Manual Refresh (Recommended)
1. Update employee name on employees page
2. Click your profile picture/name in the header
3. Click "Refresh profile" button
4. Name should update immediately

### Method 2: Page Refresh
1. Update employee name on employees page
2. Refresh the browser page (F5 or Ctrl+R)
3. Name should update

### Method 3: Sign Out/In
1. Update employee name on employees page
2. Sign out
3. Sign back in
4. Name should update

## Technical Details

### Authentication Context Flow
```
User updates employee name
    ↓
Employee service updates both collections:
  - employees/{id} → name field
  - users/{uid} → displayName field
    ↓
User clicks "Refresh profile"
    ↓
refreshUserData() called
    ↓
loadUserData() fetches fresh data from Firestore
    ↓
userProfile state updated
    ↓
UI re-renders with new name
```

### Cache Invalidation Strategy
1. **Timestamp Update**: Adding `lastUpdated` field forces Firestore to recognize the document as changed
2. **Manual Refresh**: Bypasses any client-side caching by directly querying Firestore
3. **State Update**: React state update triggers re-render of all components using the auth context

## Testing

### Test Case 1: Manual Refresh
1. Go to http://localhost:3000/employees
2. Edit your employee record, change name to "Naveen Kumar"
3. Save changes
4. Click profile picture in header
5. Click "Refresh profile"
6. ✅ Name should show "Naveen Kumar" in dropdown
7. Go to http://localhost:3000/profile
8. ✅ Name should show "Naveen Kumar" on profile page

### Test Case 2: Page Refresh
1. Update employee name
2. Press F5 to refresh page
3. ✅ Name should be updated everywhere

### Test Case 3: Multiple Updates
1. Update name to "Test Name 1"
2. Refresh profile
3. Update name to "Test Name 2"
4. Refresh profile
5. ✅ Each update should be reflected after refresh

## Debugging

If the name still doesn't update:

### Check Console Logs
Look for these messages in browser console:
```
User profile updated successfully for: [email]
New display name: [new name]
User data refreshed successfully
```

### Check Firestore
1. Open Firebase Console
2. Go to Firestore Database
3. Check `users` collection
4. Find your user document by email
5. Verify `displayName` field is updated

### Check Network Tab
1. Open browser DevTools → Network tab
2. Click "Refresh profile"
3. Look for Firestore API calls
4. Verify the response contains updated data

## Common Issues

### Issue: "No user profile found for email"
**Cause**: User document doesn't exist in `users` collection
**Solution**: 
1. Check if user was created properly
2. Verify email matches between `employees` and `users` collections
3. May need to recreate user account

### Issue: Refresh button doesn't work
**Cause**: Auth context not properly initialized
**Solution**:
1. Check browser console for errors
2. Verify you're signed in
3. Try signing out and back in

### Issue: Name updates in dropdown but not profile page
**Cause**: Profile page might be using cached data
**Solution**:
1. Refresh the profile page specifically
2. Check if profile page is using the auth context correctly

## Files Modified

1. `src/contexts/enhanced-auth.context.tsx` - Added `refreshUserData()` method
2. `src/types/auth.types.ts` - Added `refreshUserData` to `AuthContextType`
3. `src/services/employee.service.ts` - Added cache busting timestamp
4. `src/components/Layouts/header/user-info/index.tsx` - Added refresh button

## Future Improvements

1. **Auto-refresh**: Automatically refresh after employee update
2. **Real-time Updates**: Use Firestore listeners for instant updates
3. **Optimistic Updates**: Update UI immediately, sync in background
4. **Toast Notifications**: Show success message after refresh
5. **Retry Logic**: Automatically retry failed refreshes
