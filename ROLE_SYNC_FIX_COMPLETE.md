# User Role Sync Fix - COMPLETE ✅

## Problem Identified

All users showing as "employee" regardless of their actual role (admin/manager) in Firestore.

**Root Cause:** Roles were stored in Firestore `/users` collection, but Firebase Auth custom claims were not being set. The auth context was defaulting to 'employee' when no custom claims existed.

## Solution Implemented

### 1. Created Cloud Functions for Role Syncing

**File:** `functions/src/index.ts`

Added 3 new Cloud Functions:

1. **`setUserClaims`** - Sets custom claims for a single user
2. **`syncAllUserRoles`** - One-time sync of all users (admin only)
3. **`syncUserRoleOnUpdate`** - Automatic trigger when user document changes

These functions sync Firestore roles to Firebase Auth custom claims.

### 2. Created Client Utility

**File:** `src/utils/sync-user-roles.ts`

Utility functions to call the Cloud Functions from the client:
- `syncAllUserRoles()` - Sync all users
- `setUserClaims()` - Set claims for specific user

### 3. Updated Role Management Service

**File:** `src/services/role-management.service.ts`

Modified `assignRole()` to automatically call `setUserClaims()` when assigning roles.

### 4. Created Admin Sync Page

**File:** `src/app/admin/sync-roles/page.tsx`

Admin-only page to manually trigger the sync for all existing users.

## How to Deploy and Fix

### Step 1: Deploy Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

This will deploy:
- `setUserClaims`
- `syncAllUserRoles`
- `syncUserRoleOnUpdate`

### Step 2: Deploy Frontend

```bash
git add .
git commit -m "fix: sync user roles from Firestore to Firebase Auth custom claims"
git push origin main
```

Wait for Vercel to deploy.

### Step 3: Run the Sync (One-Time Fix)

1. Log in as an admin
2. Go to `/admin/sync-roles`
3. Click "Sync All User Roles"
4. Wait for completion

This will sync all existing users' roles from Firestore to Firebase Auth.

### Step 4: Users Refresh Tokens

Users need to refresh their auth tokens:

**Option A: Log out and log back in** (Immediate)
**Option B: Wait up to 1 hour** (Automatic token refresh)

## How It Works

### Before Fix ❌

1. User role stored in Firestore: `role: "admin"`
2. Firebase Auth custom claims: `{}` (empty)
3. Auth context checks claims first, finds nothing
4. Defaults to: `role: "employee"`
5. Result: Admin appears as employee

### After Fix ✅

1. User role stored in Firestore: `role: "admin"`
2. Cloud Function sets custom claims: `{ role: "admin", isAdmin: true }`
3. Auth context reads claims: `role: "admin"`
4. Result: Admin appears as admin

### Automatic Sync

Going forward, whenever a role is changed:

1. Firestore document updated: `role: "manager"`
2. Firestore trigger fires: `syncUserRoleOnUpdate`
3. Custom claims updated automatically
4. User's next token refresh includes new role

## Verification

### Check User's Custom Claims

In browser console (after sync):

```javascript
firebase.auth().currentUser.getIdTokenResult().then(token => {
  console.log('Custom claims:', token.claims);
  // Should show: { role: "admin", isAdmin: true, permissions: [...] }
});
```

### Check Firestore

Firebase Console → Firestore → `users` collection:
- Each user should have `role` field
- Should be "admin", "manager", or "employee"

### Check Auth Context

In your app, check the auth context:

```javascript
const { claims, isAdmin, isManager, isEmployee } = useEnhancedAuth();
console.log('Role:', claims?.role);
console.log('Is Admin:', isAdmin);
```

## Important Notes

### Notifications NOT Affected ✅

The notification system is completely separate and will continue working:
- Notifications use FCM tokens (stored in `fcmTokens` collection)
- Push notifications use service worker
- No changes to notification code
- Roles don't affect notification delivery

### Automatic Sync

After the initial one-time sync:
- New role assignments sync automatically
- Firestore trigger handles it
- No manual intervention needed

### Token Refresh

Firebase Auth tokens refresh automatically:
- Every 1 hour by default
- Or when user logs out/in
- Or when `refreshClaims()` is called

## Testing

### Test 1: Check Existing User

1. Log in as a user who should be admin
2. Check browser console:
```javascript
firebase.auth().currentUser.getIdTokenResult().then(t => console.log(t.claims));
```
3. Should show correct role

### Test 2: Assign New Role

1. Go to user management
2. Change a user's role
3. User logs out and back in
4. Role should be updated

### Test 3: New User

1. Create a new user with role "manager"
2. User logs in
3. Should have manager role immediately

## Troubleshooting

### Issue: Still showing as employee

**Solution:**
1. Check if Cloud Functions deployed successfully
2. Run the sync again from `/admin/sync-roles`
3. User should log out and log back in
4. Check Firebase Console → Authentication → Users → Custom claims

### Issue: Sync function fails

**Solution:**
1. Check Firebase Console → Functions → Logs
2. Verify user running sync is admin in Firestore
3. Check Cloud Functions region matches (`asia-south2`)

### Issue: New role assignments don't sync

**Solution:**
1. Check Firestore trigger is deployed: `syncUserRoleOnUpdate`
2. Check Firebase Console → Functions → Logs
3. Verify Firestore document is being updated

## Files Changed

### Cloud Functions
- `functions/src/index.ts` - Added 3 new functions

### Frontend
- `src/utils/sync-user-roles.ts` - New utility
- `src/services/role-management.service.ts` - Updated assignRole
- `src/app/admin/sync-roles/page.tsx` - New admin page

### No Changes To
- Notification system ✅
- Service workers ✅
- Firebase messaging ✅
- Any other features ✅

## Deployment Checklist

- [ ] Cloud Functions built (`npm run build` in functions/)
- [ ] Cloud Functions deployed (`firebase deploy --only functions`)
- [ ] Frontend code committed and pushed
- [ ] Vercel deployment complete
- [ ] Admin logged in
- [ ] Sync page accessed (`/admin/sync-roles`)
- [ ] Sync button clicked
- [ ] All users synced successfully
- [ ] Users notified to log out/in
- [ ] Roles verified in user management

## Success Criteria

✅ All users show correct roles (admin/manager/employee)
✅ Admins can access admin pages
✅ Managers can access manager pages
✅ Employees have employee access
✅ New role assignments sync automatically
✅ Notifications still working
✅ No errors in console

## Support

If issues persist:

1. Check Firebase Console → Functions → Logs
2. Check browser console for errors
3. Verify Firestore `/users` collection has correct roles
4. Check Firebase Authentication → Users → Custom claims
5. Try manual token refresh: `user.getIdToken(true)`

---

**This fix resolves the role issue permanently!** Once deployed and synced, roles will work correctly and sync automatically going forward. 🎉
