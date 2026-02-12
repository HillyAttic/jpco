# Push Notification Diagnostic Report

## Issue Description

**Problem:** Notifications showing generic Chrome fallback ("Tap to copy URL") instead of detailed notification with task information.

**What this means:** The service worker is NOT displaying the notification, so Chrome shows its default fallback.

## Root Cause Analysis

### Why Chrome Shows "Tap to copy URL"

Chrome shows this fallback notification when:
1. A push event is received
2. The service worker doesn't call `showNotification()` within the push event handler
3. OR the service worker isn't registered/active at all

### Current Setup (Correct)

✅ Cloud Functions sending data-only messages (correct for PWA)
✅ Service worker has proper push handler
✅ Service worker calls `showNotification()` in all code paths

### Likely Issues

1. **Service Worker Not Registered** - Most likely cause
2. **Wrong Service Worker Active** - `sw.js` instead of `firebase-messaging-sw.js`
3. **Service Worker Scope Issue** - Not controlling the page
4. **Service Worker Update Pending** - Old version still active

## Diagnostic Steps

### Step 1: Check Service Worker Registration

Open your PWA on mobile, then:

1. Connect phone to computer via USB
2. Enable USB debugging on phone
3. Open Chrome on computer: `chrome://inspect#devices`
4. Click "inspect" on your PWA
5. In DevTools Console, run:

```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registered SWs:', regs.length);
  regs.forEach(reg => {
    console.log('SW:', reg.active?.scriptURL);
    console.log('Scope:', reg.scope);
    console.log('State:', reg.active?.state);
  });
});
```

**Expected output:**
```
Registered SWs: 1
SW: https://jpcopanel.vercel.app/firebase-messaging-sw.js
Scope: https://jpcopanel.vercel.app/
State: activated
```

**If you see `sw.js` instead:** That's the problem! Wrong service worker is active.

### Step 2: Check Which SW Handles Push

In the same DevTools console:

```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('Active SW:', reg.active.scriptURL);
});
```

**Must show:** `firebase-messaging-sw.js`

### Step 3: Force Update Service Worker

If wrong SW is active:

```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
}).then(() => {
  console.log('All SWs unregistered');
  location.reload();
});
```

Then re-enable notifications on the `/notifications` page.

### Step 4: Check Push Event Logs

When a notification is sent, check the service worker console:

1. In `chrome://inspect#devices`
2. Find "Service Workers" section
3. Click "inspect" on `firebase-messaging-sw.js`
4. Send a test notification
5. Look for logs like:

```
[SW v5.1] ===== PUSH EVENT =====
[SW v5.1] Payload keys: [...]
[SW v5.1] 🔔 Title: New Task Assigned
[SW v5.1] 🔔 Body: You have been assigned...
```

**If you don't see these logs:** Service worker isn't receiving push events.

## Quick Fixes

### Fix 1: Unregister All Service Workers

Run this in browser console on your PWA:

```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  Promise.all(regs.map(reg => reg.unregister())).then(() => {
    console.log('All service workers unregistered');
    alert('Service workers cleared. Please reload and re-enable notifications.');
  });
});
```

### Fix 2: Clear All Data and Re-register

1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Check all boxes
5. Click "Clear site data"
6. Reload page
7. Go to `/notifications`
8. Click "Enable Notifications"

### Fix 3: Check Service Worker File

Verify the file is accessible:

Open in browser: `https://jpcopanel.vercel.app/firebase-messaging-sw.js`

Should show the service worker code (not 404).

### Fix 4: Update Service Worker Registration Code

Check where the service worker is registered. Search for:

```javascript
navigator.serviceWorker.register
```

Make sure it's registering `firebase-messaging-sw.js` and NOT `sw.js`.

## Code to Check

### 1. Check `src/lib/firebase-messaging.ts`

Look for the service worker registration:

```typescript
const registration = await navigator.serviceWorker.register(
  '/firebase-messaging-sw.js',
  { scope: '/' }
);
```

**Must be:** `/firebase-messaging-sw.js` (NOT `/sw.js`)

### 2. Check `src/app/service-worker-provider.tsx`

If this file exists, check what it registers.

### 3. Check `next.config.mjs`

Look for any service worker configuration.

## Testing After Fix

### Test 1: Manual Notification Test

In browser console:

```javascript
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    new Notification('Test', {
      body: 'Manual test notification',
      icon: '/images/logo/logo-icon.svg'
    });
  }
});
```

This should show a notification immediately.

### Test 2: Service Worker Test

In service worker console (chrome://inspect):

```javascript
self.registration.showNotification('SW Test', {
  body: 'Test from service worker',
  icon: '/images/logo/logo-icon.svg',
  requireInteraction: true
});
```

This should show a notification with proper formatting.

### Test 3: FCM Test

Create a test notification in Firestore:

```javascript
// In Firestore console, add to 'notifications' collection:
{
  userId: "YOUR_USER_ID",
  title: "Test Task Assigned",
  body: "You have been assigned a new task: Test notification",
  read: false,
  createdAt: new Date(),
  sent: false,
  data: {
    url: "/tasks",
    type: "task_assigned",
    taskId: "test123"
  }
}
```

The Cloud Function should trigger and send the push notification.

## Expected Behavior After Fix

When a notification is sent, you should see:

1. **Service Worker Console:**
   ```
   [SW v5.1] ===== PUSH EVENT =====
   [SW v5.1] Payload keys: ["data", "from", "fcmMessageId"]
   [SW v5.1] 🔔 Title: New Task Assigned
   [SW v5.1] 🔔 Body: You have been assigned a new task: test notification type 2
   ```

2. **Notification Display:**
   - Title: "New Task Assigned"
   - Body: Full task description
   - Icon: JPCO logo
   - Actions: VIEW, DISMISS, UNSUBSCRIBE
   - Domain: jpcopanel.vercel.app
   - Time: "37m" (or current time)

3. **NOT the fallback:**
   - ❌ "JPCO"
   - ❌ "Tap to copy the URL for this app"
   - ❌ "SHARE" / "OPEN IN CHROME BROWSER"

## Next Steps

1. Run diagnostic Step 1 to check which service worker is active
2. If wrong SW, run Fix 1 to unregister all
3. Reload and re-enable notifications
4. Send test notification
5. Check service worker console for logs

## Files to Investigate

- `src/lib/firebase-messaging.ts` - SW registration
- `src/app/service-worker-provider.tsx` - SW provider (if exists)
- `public/firebase-messaging-sw.js` - Push handler
- `public/sw.js` - Should NOT handle push events
- `next.config.mjs` - SW configuration

## Support

If issue persists after these steps, we need to:
1. Check Firebase Cloud Functions logs
2. Verify FCM message format
3. Check browser console for errors
4. Inspect network tab for push subscription
