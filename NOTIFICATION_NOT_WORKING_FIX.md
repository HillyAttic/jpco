# Push Notifications Not Working After Service Worker Fix

## Problem
After the commit "fix(notifications): resolve push notification service worker conflicts", push notifications stopped working even though they were working before.

## Root Cause
The service worker registration logic had an issue where when `firebase-messaging-sw.js` was already registered, it would return early without properly setting up the update listener. This caused the service worker to not properly handle push events.

## Fix Applied

### 1. Updated `src/hooks/use-service-worker.ts`
Fixed the registration logic to properly handle already-registered service workers by:
- Adding the `updatefound` event listener even when SW is already registered
- Ensuring the state is properly updated with the existing registration
- Properly waiting for the service worker to be ready

## Manual Steps to Fix Notifications

### Step 1: Clear Service Worker Cache
1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Click "Service Workers" in left sidebar
4. Click "Unregister" for all service workers
5. Click "Clear storage" in left sidebar
6. Check all boxes and click "Clear site data"
7. Close DevTools

### Step 2: Hard Refresh
1. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or press `Ctrl+F5` (Windows)

### Step 3: Re-enable Notifications
1. Visit `/notifications` page
2. Click "Enable Notifications" button
3. Grant permission when browser prompts
4. Verify FCM token is saved (check console for "FCM token saved successfully")

### Step 4: Verify Service Worker
1. Open Chrome DevTools (F12)
2. Go to Application tab → Service Workers
3. Verify only `firebase-messaging-sw.js` is registered
4. Status should be "activated and is running"

### Step 5: Test Notification
1. Have an admin/manager create a task and assign it to you
2. You should receive a push notification immediately
3. Check browser console for any errors

## Diagnostic Commands

### Check Service Worker Status
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registered SWs:', regs.map(r => ({
    scope: r.scope,
    active: r.active?.scriptURL,
    state: r.active?.state
  })));
});
```

### Check FCM Token
```javascript
// Run in browser console
fetch('/api/notifications/fcm-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    token: 'test-token'
  })
}).then(r => r.json()).then(console.log);
```

### Check Notification Permission
```javascript
// Run in browser console
console.log('Notification permission:', Notification.permission);
console.log('Service Worker support:', 'serviceWorker' in navigator);
console.log('Push support:', 'PushManager' in window);
```

## Common Issues and Solutions

### Issue 1: "Service worker registration failed"
**Solution**: Clear all service workers and hard refresh

### Issue 2: "No FCM token found"
**Solution**: Visit `/notifications` page and enable notifications

### Issue 3: "Permission denied"
**Solution**: 
1. Click the lock icon in address bar
2. Reset notification permission
3. Refresh page and enable notifications again

### Issue 4: Multiple service workers registered
**Solution**: 
1. Unregister all service workers manually
2. Hard refresh
3. Let the app register only firebase-messaging-sw.js

### Issue 5: Notifications work on desktop but not mobile
**Solution**:
1. On mobile, visit the site
2. Add to Home Screen (PWA install)
3. Open the PWA app
4. Enable notifications from within the PWA

## Verification Checklist

- [ ] Only `firebase-messaging-sw.js` is registered (check DevTools → Application → Service Workers)
- [ ] Service worker status is "activated and is running"
- [ ] Notification permission is "granted" (check browser address bar)
- [ ] FCM token exists in Firestore `fcmTokens/{userId}` collection
- [ ] Console shows "FCM token saved successfully"
- [ ] Console shows "[SW v5.2] Loaded"
- [ ] Test notification is received when task is assigned

## Architecture Flow

### Correct Flow:
```
1. User visits /notifications page
2. Clicks "Enable Notifications"
3. Browser requests permission
4. Permission granted
5. firebase-messaging-sw.js registers
6. FCM token generated
7. Token saved to Firestore via Admin SDK
8. Admin creates task and assigns to user
9. API sends notification via Admin SDK
10. FCM delivers to service worker
11. Service worker displays notification
12. User sees notification
```

### What Was Broken:
```
Step 5: Service worker was already registered but update listener wasn't attached
Step 11: Service worker couldn't properly handle push events
Result: No notification displayed
```

## Files Modified
1. `src/hooks/use-service-worker.ts` - Fixed registration logic

## Testing
After applying the fix:
1. Clear all service workers
2. Hard refresh
3. Enable notifications
4. Create a test task
5. Verify notification is received

## Notes
- Service workers are persistent across page reloads
- Clearing service workers requires manual action or code
- FCM tokens are device-specific
- Notifications require HTTPS (or localhost for testing)
- Mobile browsers may have additional restrictions
