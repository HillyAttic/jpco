# 🚀 Deploy Notification Fix - Quick Guide

## Changes Made

### 1. Deleted Conflicting Service Worker
- **File Deleted**: `public/sw.js`
- **Reason**: Was causing conflicts with `firebase-messaging-sw.js`

### 2. Updated Service Worker Hook
- **File**: `src/hooks/use-service-worker.ts`
- **Change**: Now unregisters ALL service workers before registering firebase-messaging-sw.js
- **Benefit**: Ensures clean slate, no conflicts

### 3. Added Documentation
- `NOTIFICATION_FIX_URGENT_V2.md` - Detailed explanation and manual fix steps
- `test-notification-fix.js` - Diagnostic script for testing
- `DEPLOY_NOTIFICATION_FIX.md` - This deployment guide

## 🔥 Deployment Steps

### 1. Commit and Push
```bash
git add .
git commit -m "fix(notifications): remove conflicting sw.js and improve service worker cleanup"
git push origin main
```

### 2. Verify Deployment
- Vercel will automatically deploy on push
- Wait for deployment to complete (~2-3 minutes)
- Check deployment status at: https://vercel.com/your-project

### 3. Clear Service Workers (CRITICAL!)

This is the most important step. Service workers are cached and won't update automatically.

#### On Desktop:
1. Open your app in Chrome
2. Press F12 to open DevTools
3. Go to **Application** tab
4. Click **Service Workers** in left sidebar
5. Click **Unregister** for ALL service workers
6. Close DevTools
7. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

#### On Mobile (Android):
1. Open Chrome on your phone
2. Type in address bar: `chrome://serviceworker-internals/`
3. Find all service workers for your domain
4. Click **Unregister** for each one
5. Close Chrome completely (swipe away from recent apps)
6. Reopen your PWA

#### Alternative: Use the Fix Button
1. Open your app
2. Go to `/notifications` page
3. Click the **"Fix SW Issues"** button
4. App will automatically unregister all SWs and reload

### 4. Test Notifications

#### Method 1: Assign a Task
1. Go to `/tasks/non-recurring`
2. Create a new task
3. Assign it to a user
4. User should receive notification

#### Method 2: Use Diagnostic Script
1. Open browser console (F12)
2. Copy contents of `test-notification-fix.js`
3. Paste into console
4. Run: `await testNotifications()`
5. Check for any errors
6. Run: `await sendTestNotification('YOUR_USER_ID')`

#### Method 3: Use API Directly
```javascript
// In browser console:
fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userIds: ['YOUR_USER_ID'],
    title: 'Test Notification',
    body: 'Testing push notifications',
    data: { url: '/notifications', type: 'test' }
  })
}).then(r => r.json()).then(console.log);
```

## ✅ Expected Results

### Before Fix:
- Notification shows: "JPCO" / "Tap to copy the URL for this app"
- No action buttons
- Generic Chrome fallback

### After Fix:
- Notification shows: "New Task Assigned" / "You have been assigned a new task: [task name]"
- Action buttons: "View" and "Dismiss"
- Proper icon and badge
- Vibration on mobile
- Heads-up display on Android

## 🔍 Verification Checklist

- [ ] Code deployed to Vercel
- [ ] Service workers cleared on all test devices
- [ ] Only `firebase-messaging-sw.js` is registered (check in DevTools)
- [ ] Notification permission is granted
- [ ] FCM token is saved in Firestore (`fcmTokens` collection)
- [ ] Test notification received with proper details
- [ ] Task assignment triggers notification
- [ ] Notification has action buttons
- [ ] Clicking notification navigates to correct page

## 🐛 Troubleshooting

### Issue: Still seeing "Tap to copy URL" notification

**Solution:**
1. Service workers not cleared properly
2. Run: `chrome://serviceworker-internals/` and unregister ALL
3. Clear site data: Settings → Site Settings → Clear Data
4. Reload app

### Issue: No notification received at all

**Check:**
1. Notification permission granted? (Check in browser settings)
2. FCM token saved? (Check Firestore `fcmTokens` collection)
3. Service worker registered? (Check DevTools → Application → Service Workers)
4. Cloud Function logs (Firebase Console → Functions → Logs)

### Issue: Multiple service workers still registered

**Solution:**
1. Click "Fix SW Issues" button on `/notifications` page
2. Or manually unregister all in DevTools
3. Hard refresh the page

## 📊 Monitoring

### Check Cloud Function Logs:
1. Go to: https://console.firebase.google.com/project/jpcopanel/functions/logs
2. Filter by: `sendPushNotification`
3. Look for successful sends or errors

### Check Firestore:
1. Go to: https://console.firebase.google.com/project/jpcopanel/firestore
2. Check `notifications` collection for new documents
3. Check `fcmTokens` collection for user tokens

### Check Browser Console:
Look for these logs:
- `[SW v5.1] Loaded` - Service worker loaded
- `[SW v5.1] ===== PUSH EVENT =====` - Push event received
- `[SW v5.1] 🔔 Title: ...` - Notification being displayed

## 🎯 Success Criteria

The fix is successful when:
1. Only ONE service worker is registered (`firebase-messaging-sw.js`)
2. Push notifications show detailed information (title, body, actions)
3. No more "Tap to copy URL" fallback notifications
4. Notifications work consistently on both desktop and mobile
5. Task assignments trigger immediate notifications

## 📞 Support

If issues persist after following all steps:
1. Run diagnostic script: `await testNotifications()`
2. Check all logs (browser console, Cloud Functions, Firestore)
3. Verify FCM token exists in Firestore
4. Test with multiple users/devices
5. Check Firebase project settings (FCM enabled, VAPID key configured)

---

**Last Updated**: After removing `sw.js` and updating service worker cleanup logic
**Status**: Ready for deployment and testing
