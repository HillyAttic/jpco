# Push Notification Fix - URGENT

## Issue Summary

**Problem:** Push notifications showing generic Chrome fallback ("Tap to copy URL") instead of detailed notification with task information.

**Root Cause:** Multiple service workers registered, causing conflict. The wrong service worker (`sw.js`) is handling push events instead of `firebase-messaging-sw.js`.

## Why This Happens

1. Your app registers `firebase-messaging-sw.js` via `useServiceWorker` hook ✅
2. BUT `sw.js` might have been registered earlier or by another script
3. When multiple SWs are registered, the browser uses the first one
4. `sw.js` does NOT handle push events properly (by design - it's for caching only)
5. When push arrives, `sw.js` receives it but doesn't call `showNotification()`
6. Chrome shows fallback: "Tap to copy URL"

## The Fix

### Step 1: Unregister All Service Workers

Add this code to your notifications page or create a dedicated "Fix Notifications" button:

```typescript
// Add to src/app/notifications/page.tsx

const fixServiceWorker = async () => {
  try {
    // Get all registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    console.log(`Found ${registrations.length} service worker(s)`);
    
    // Unregister all
    for (const registration of registrations) {
      console.log('Unregistering:', registration.scope);
      await registration.unregister();
    }
    
    console.log('All service workers unregistered');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reload to re-register the correct one
    window.location.reload();
  } catch (error) {
    console.error('Error fixing service worker:', error);
    alert('Failed to fix service worker. Please try manually clearing site data.');
  }
};
```

### Step 2: Prevent `sw.js` from Registering

The issue is that both service workers are trying to register. We need to ensure ONLY `firebase-messaging-sw.js` is registered.

**Option A: Delete `sw.js`** (Recommended if not needed)

```bash
# If sw.js is not needed for anything else
rm public/sw.js
```

**Option B: Modify `sw.js` to not register**

If you need `sw.js` for something, modify it to check if Firebase SW is already registered:

```javascript
// At the top of public/sw.js
self.addEventListener('install', (event) => {
  // Don't activate if firebase-messaging-sw.js is registered
  event.waitUntil(
    clients.matchAll().then(clients => {
      // Skip activation
      return self.skipWaiting();
    })
  );
});
```

### Step 3: Ensure Only Firebase SW Registers

Modify `src/hooks/use-service-worker.ts`:

```typescript
const registerServiceWorker = useCallback(async () => {
  if (!('serviceWorker' in navigator)) {
    setState(prev => ({
      ...prev,
      isSupported: false,
      error: 'Service Worker not supported'
    }));
    return;
  }

  try {
    // FIRST: Unregister any existing service workers that aren't firebase-messaging-sw.js
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of existingRegistrations) {
      if (reg.active && !reg.active.scriptURL.includes('firebase-messaging-sw.js')) {
        console.log('Unregistering non-Firebase SW:', reg.active.scriptURL);
        await reg.unregister();
      }
    }

    // THEN: Register Firebase messaging service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    setState(prev => ({
      ...prev,
      isSupported: true,
      isRegistered: true,
      registration,
      error: null
    }));

    // ... rest of the code
  } catch (error) {
    // ... error handling
  }
}, []);
```

## Quick User Fix (No Code Changes)

If you need an immediate fix without deploying code:

### For Users:

1. Open your PWA
2. Open browser menu (3 dots)
3. Go to "Settings"
4. Search for "Site settings" or "App info"
5. Find your app (jpcopanel.vercel.app)
6. Tap "Clear & reset" or "Storage"
7. Clear all data
8. Close and reopen the app
9. Go to /notifications
10. Enable notifications again

### Via Chrome DevTools (Desktop):

1. Open your PWA
2. Press F12 (DevTools)
3. Go to Application tab
4. Click "Service Workers" in left sidebar
5. Click "Unregister" on ALL service workers
6. Go to "Storage" in left sidebar
7. Click "Clear site data"
8. Reload page
9. Go to /notifications
10. Enable notifications

### Via Remote Debugging (Mobile):

1. Connect phone to computer via USB
2. Enable USB debugging on phone
3. Open Chrome on computer
4. Go to `chrome://inspect#devices`
5. Find your device and click "inspect"
6. In DevTools console, run:

```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  Promise.all(regs.map(r => r.unregister())).then(() => {
    alert('Service workers cleared. Reloading...');
    location.reload();
  });
});
```

## Verification

After applying the fix, verify:

1. **Check Active SW:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('Active SW:', reg.active.scriptURL);
  // Should show: .../firebase-messaging-sw.js
});
```

2. **Check SW Count:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Total SWs:', regs.length);
  // Should be: 1
});
```

3. **Test Notification:**
   - Send a test notification
   - Should show detailed notification with:
     - Title: "New Task Assigned"
     - Body: Full task description
     - Actions: VIEW, DISMISS, UNSUBSCRIBE
     - NOT the fallback "Tap to copy URL"

## Code Changes to Deploy

### File 1: `src/hooks/use-service-worker.ts`

Add cleanup before registration (see Step 3 above).

### File 2: `src/app/notifications/page.tsx`

Add a "Fix Notifications" button:

```typescript
<button
  onClick={async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
    window.location.reload();
  }}
  className="px-4 py-2 bg-yellow-600 text-white rounded-lg"
>
  Fix Service Worker Issues
</button>
```

### File 3: `public/sw.js` (Optional)

Either delete this file or modify it to not handle push events (it already doesn't, but we want to prevent it from registering at all).

## Prevention

To prevent this issue in the future:

1. **Only register ONE service worker** for push notifications
2. **Use `firebase-messaging-sw.js`** exclusively for FCM
3. **Don't register `sw.js`** if you're using Firebase messaging
4. **Check for existing registrations** before registering new ones
5. **Use unique scopes** if you must have multiple SWs (not recommended)

## Testing Checklist

After deploying the fix:

- [ ] Only 1 service worker registered
- [ ] Service worker is `firebase-messaging-sw.js`
- [ ] Push notifications show detailed content
- [ ] No "Tap to copy URL" fallback
- [ ] Notification actions work (VIEW, DISMISS)
- [ ] Clicking notification navigates correctly
- [ ] Service worker logs show push events

## Support

If issue persists:

1. Check Firebase Cloud Functions logs
2. Verify FCM message format (data-only, no top-level notification)
3. Check service worker console for errors
4. Verify VAPID key is correct
5. Test on different device/browser

## Related Files

- `public/firebase-messaging-sw.js` - Push notification handler
- `public/sw.js` - Caching SW (should NOT handle push)
- `src/hooks/use-service-worker.ts` - SW registration
- `src/app/service-worker-provider.tsx` - SW provider component
- `functions/src/index.ts` - Cloud Functions (FCM sender)
