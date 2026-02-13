# Push Notification Issue - Complete Diagnosis & Fix

## Summary
Push notifications were working before the service worker conflict fix commit, but stopped working after. The issue was in the service worker registration logic.

## Root Cause Analysis

### What Happened:
1. **Before the fix**: Notifications were working (as shown in your screenshot)
2. **After the fix**: Service worker registration logic was updated to prevent conflicts
3. **Bug introduced**: When `firebase-messaging-sw.js` was already registered, the code returned early without setting up the `updatefound` event listener
4. **Result**: Service worker couldn't properly handle push events

### Technical Details:
```typescript
// BROKEN CODE (before fix):
if (firebaseSwRegistered) {
  console.log('[SW] firebase-messaging-sw.js already registered, skipping re-registration');
  const registration = existingRegistrations.find(...);
  
  if (registration) {
    setState(...);
    await navigator.serviceWorker.ready;
    console.log('[SW] Service worker is ready');
  }
  return; // ❌ Returns early, no event listener attached!
}

// FIXED CODE (after fix):
if (firebaseSwRegistration) {
  console.log('[SW] firebase-messaging-sw.js already registered, skipping re-registration');
  
  setState(...);
  await navigator.serviceWorker.ready;
  
  // ✅ Now properly attaches event listener
  firebaseSwRegistration.addEventListener('updatefound', () => {
    // Handle updates
  });
  
  return;
}
```

## Fix Applied

### File Modified: `src/hooks/use-service-worker.ts`

**Changes:**
1. Added `updatefound` event listener even when SW is already registered
2. Ensured state is properly updated with existing registration
3. Properly waits for service worker to be ready

## How to Fix Notifications (User Steps)

### Quick Fix (Recommended):
1. Visit `/notifications` page
2. Click the **"Fix SW Issues"** button (yellow button)
3. Wait for page to reload
4. Click **"Enable Notifications"** button
5. Grant permission when browser prompts
6. Done! Notifications should now work

### Manual Fix (If Quick Fix Doesn't Work):
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** for all service workers
5. Click **Clear storage** in left sidebar
6. Check all boxes and click **Clear site data**
7. Close DevTools
8. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
9. Visit `/notifications` page
10. Click **"Enable Notifications"**
11. Grant permission

## Verification Steps

### 1. Check Service Worker Status
Open DevTools → Application → Service Workers

**Expected:**
- Only `firebase-messaging-sw.js` should be registered
- Status: "activated and is running"
- Version: v5.2

### 2. Check Console Logs
Look for these messages:
```
[SW] firebase-messaging-sw.js already registered, skipping re-registration
[SW] Service worker is ready
[SW v5.2] Loaded
FCM token saved successfully
```

### 3. Check FCM Token
In Firestore console, verify:
- Collection: `fcmTokens`
- Document ID: `{your-user-id}`
- Field: `token` (should have a long string value)

### 4. Test Notification
1. Have an admin/manager create a task
2. Assign the task to you
3. You should receive a push notification immediately

## Diagnostic Commands

Run these in browser console to diagnose issues:

### Check Service Workers:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.map(r => ({
    scope: r.scope,
    active: r.active?.scriptURL,
    state: r.active?.state
  })));
});
```

### Check Notification Permission:
```javascript
console.log({
  permission: Notification.permission,
  swSupport: 'serviceWorker' in navigator,
  pushSupport: 'PushManager' in window,
  notificationSupport: 'Notification' in window
});
```

### Check FCM Token (replace USER_ID):
```javascript
fetch('/api/notifications/fcm-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID_HERE',
    token: 'test-token-' + Date.now()
  })
}).then(r => r.json()).then(console.log);
```

## Common Issues & Solutions

### Issue 1: "No FCM token found"
**Cause**: User hasn't enabled notifications
**Solution**: Visit `/notifications` and click "Enable Notifications"

### Issue 2: Multiple service workers registered
**Cause**: Old service workers not cleaned up
**Solution**: Click "Fix SW Issues" button or manually unregister all SWs

### Issue 3: Permission denied errors in console
**Cause**: Firestore security rules or API using Client SDK
**Solution**: Already fixed - all APIs now use Admin SDK

### Issue 4: Notifications work on desktop but not mobile
**Cause**: Mobile browser restrictions
**Solution**: 
- On iOS: Add to Home Screen first, then enable notifications
- On Android: Ensure Chrome is up to date

### Issue 5: Service worker shows "waiting to activate"
**Cause**: Old service worker still active
**Solution**: Close all tabs of the site, then reopen

## Architecture Overview

### Complete Notification Flow:
```
1. User visits /notifications page
   ↓
2. Clicks "Enable Notifications" button
   ↓
3. Browser requests permission
   ↓
4. Permission granted
   ↓
5. firebase-messaging-sw.js registers (via use-service-worker hook)
   ↓
6. FCM token generated (via firebase-messaging.ts)
   ↓
7. Token saved to Firestore (via /api/notifications/fcm-token using Admin SDK)
   ↓
8. Admin creates task and assigns to user
   ↓
9. API sends notification (via /api/notifications/send using Admin SDK)
   ↓
10. FCM delivers push to service worker
   ↓
11. Service worker displays notification (firebase-messaging-sw.js v5.2)
   ↓
12. User sees notification on device
```

### What Was Broken:
- **Step 5**: Service worker registered but event listener not attached
- **Step 11**: Service worker couldn't properly handle push events
- **Result**: No notification displayed

### What's Fixed:
- **Step 5**: Event listener now properly attached even for existing registrations
- **Step 11**: Service worker can now handle push events correctly
- **Result**: Notifications work again

## Files Modified in This Fix

1. **src/hooks/use-service-worker.ts**
   - Fixed registration logic to attach event listeners for existing SWs
   - Ensures proper state management

2. **src/app/api/recurring-tasks/route.ts** (from previous fix)
   - Migrated to Admin SDK for user queries
   - Fixed permission denied errors

3. **src/app/api/notifications/send/route.ts** (already correct)
   - Uses Admin SDK to fetch FCM tokens
   - Sends notifications via Firebase Admin Messaging

## Testing Checklist

- [ ] Service worker registered (only firebase-messaging-sw.js)
- [ ] Service worker status: "activated and is running"
- [ ] Notification permission: "granted"
- [ ] FCM token exists in Firestore
- [ ] Console shows "[SW v5.2] Loaded"
- [ ] Console shows "FCM token saved successfully"
- [ ] Test notification received when task assigned
- [ ] Notification shows correct title and body
- [ ] Clicking notification opens correct page
- [ ] No duplicate notifications
- [ ] No fallback "Tap to copy URL" notifications

## Next Steps

1. **Immediate**: Click "Fix SW Issues" button on `/notifications` page
2. **Enable**: Click "Enable Notifications" and grant permission
3. **Test**: Have someone assign you a task
4. **Verify**: You should receive a push notification

## Support

If notifications still don't work after following all steps:

1. Check browser console for errors
2. Verify Firestore rules are deployed
3. Verify Admin SDK is initialized correctly
4. Check FCM token exists in Firestore
5. Try on a different browser/device
6. Check if HTTPS is enabled (required for push notifications)

## Notes

- Push notifications require HTTPS (or localhost for testing)
- Service workers are persistent across page reloads
- FCM tokens are device/browser specific
- iOS requires PWA installation (Add to Home Screen)
- Some browsers may block notifications by default
- Corporate networks may block FCM endpoints
