# Fix User Roles NOW - Quick Guide

## The Problem

Everyone showing as "employee" even though they're admin/manager in Firestore.

## The Fix (4 Steps - 10 minutes)

### Step 1: Deploy Cloud Functions (3 minutes)

```bash
cd functions
npm run build
firebase deploy --only functions
```

Wait for deployment to complete.

### Step 2: Deploy Frontend (2 minutes)

```bash
cd ..
git add .
git commit -m "fix: sync user roles to Firebase Auth custom claims"
git push origin main
```

Wait for Vercel to deploy.

### Step 3: Run the Sync (2 minutes)

1. Open your app
2. Log in as admin
3. Go to: `/admin/sync-roles`
4. Click "Sync All User Roles"
5. Wait for success message

### Step 4: Refresh Tokens (3 minutes)

Tell all users to:
1. Log out
2. Log back in

OR wait 1 hour for automatic refresh.

## Done! ✅

Roles are now fixed and will sync automatically going forward.

## Verify It Worked

### Check Your Role

In browser console:

```javascript
firebase.auth().currentUser.getIdTokenResult().then(t => {
  console.log('My role:', t.claims.role);
  console.log('Is admin:', t.claims.isAdmin);
});
```

Should show your correct role!

### Check in App

- Admins should see admin menu items
- Managers should see manager features
- Employees should see employee features

## What Changed

### Added 3 Cloud Functions:
1. `setUserClaims` - Set claims for one user
2. `syncAllUserRoles` - Sync all users (one-time)
3. `syncUserRoleOnUpdate` - Auto-sync on role change

### Added Admin Page:
- `/admin/sync-roles` - Manual sync interface

### Updated Role Service:
- Now syncs to Firebase Auth when assigning roles

## Notifications Still Work ✅

No changes to notifications:
- Push notifications work
- Service worker unchanged
- FCM tokens unchanged
- Everything still working

## Future Role Changes

When you change a user's role:
1. Firestore updated
2. Custom claims synced automatically
3. User refreshes token (logout/login or wait 1 hour)
4. New role active

No manual sync needed!

## Troubleshooting

### Still showing employee?

1. Check Cloud Functions deployed:
```bash
firebase functions:list
```

Should see:
- `setUserClaims`
- `syncAllUserRoles`
- `syncUserRoleOnUpdate`

2. Run sync again at `/admin/sync-roles`

3. User must log out and back in

### Sync button doesn't work?

1. Check you're logged in as admin
2. Check browser console for errors
3. Check Firebase Functions logs

### Can't access admin page?

1. Check your role in Firestore:
   - Firebase Console → Firestore → `users` → your UID
   - Should have `role: "admin"`

2. If role is correct but still can't access:
   - Log out and log back in
   - Check custom claims in console

## Quick Commands

```bash
# Deploy functions
cd functions && npm run build && firebase deploy --only functions

# Deploy frontend
cd .. && git add . && git commit -m "fix: roles" && git push

# Check functions
firebase functions:list

# Check logs
firebase functions:log
```

## What to Tell Users

"We fixed the role system. Please log out and log back in to see your correct role and permissions."

That's it! Simple message, they'll understand.

## Success!

After these steps:
- ✅ Admins show as admin
- ✅ Managers show as manager
- ✅ Employees show as employee
- ✅ Permissions work correctly
- ✅ Auto-sync for future changes
- ✅ Notifications still working

You're all set! 🎉
