# Test Notification System - Quick Guide

## Prerequisites
1. User must have notifications enabled (FCM token registered)
2. Firebase Admin SDK credentials must be configured
3. App must be deployed or running locally

## Test 1: Check FCM Token Registration

### In Browser Console (on /notifications page):
```javascript
// Check if user has FCM token
const userId = firebase.auth().currentUser.uid;
const db = firebase.firestore();
const tokenDoc = await db.collection('fcmTokens').doc(userId).get();

if (tokenDoc.exists) {
  console.log('✅ FCM Token exists:', tokenDoc.data().token.substring(0, 20) + '...');
} else {
  console.log('❌ No FCM token - user needs to enable notifications');
}
```

## Test 2: Send Test Notification via API

### Using curl:
```bash
# Replace with your actual values
USER_ID="your-user-id-here"
APP_URL="http://localhost:3000"  # or https://jpcopanel.vercel.app

curl -X POST "$APP_URL/api/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["'$USER_ID'"],
    "title": "Test Notification",
    "body": "This is a test notification from the API",
    "data": {
      "type": "test",
      "url": "/notifications"
    }
  }'
```

### Using Browser Console:
```javascript
// Send test notification to yourself
const userId = firebase.auth().currentUser.uid;

const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userIds: [userId],
    title: 'Test Notification',
    body: 'This is a test notification',
    data: {
      type: 'test',
      url: '/notifications'
    }
  })
});

const result = await response.json();
console.log('Result:', result);
```

## Test 3: Create Task and Verify Notification

### Steps:
1. Go to /tasks page
2. Click "Create Task"
3. Fill in task details
4. Assign to a user (who has notifications enabled)
5. Click "Create"

### Check Server Logs:
Look for these messages in Vercel logs or terminal:

```
Sending task assignment notifications to 1 user(s)
[Notification Send] Request received: { userIds: [...], title: 'New Task Assigned', ... }
[Notification Send] Processing user: xxx
[Notification Send] ✅ FCM token found for user xxx
[Notification Send] ✅ FCM sent to xxx in XXms
Notifications sent successfully: { sent: [...] }
```

### Check User's Device:
- Should receive notification within 1-2 seconds
- Notification should show:
  - Title: "New Task Assigned"
  - Body: "You have been assigned a new task: [task title]"
  - Icon: JPCO logo
  - Actions: "View" and "Dismiss"

## Test 4: Verify No Duplicates (App Open)

### Steps:
1. Open app in browser (stay on any page)
2. Have another user assign you a task
3. Watch for notifications

### Expected Behavior:
- ✅ ONE notification appears from service worker
- ✅ Notification list refreshes automatically (if on /notifications page)
- ❌ NO toast notification
- ❌ NO duplicate notifications

### Check Browser Console:
```
[Foreground] Message received: {...}
[SW v5.2] ===== PUSH EVENT =====
[SW v5.2] 🔔 Title: New Task Assigned
[SW v5.2] 🔔 Body: You have been assigned a new task: ...
```

## Test 5: Verify No Fallback Notifications

### Steps:
1. Open app
2. Navigate to different pages
3. Wait 30 seconds

### Expected Behavior:
- ❌ NO "Tap to copy the URL for this app" notifications
- ❌ NO generic "JPCO Dashboard" notifications
- ❌ NO repeated notifications on page load

### If You See Fallback Notifications:
1. Go to /notifications page
2. Click "Fix SW Issues" button
3. Page will reload
4. Test again

## Test 6: Background Notifications (App Closed)

### Steps:
1. Close all browser tabs with the app
2. Have another user assign you a task
3. Check your device

### Expected Behavior:
- ✅ Notification appears on lock screen (mobile) or desktop
- ✅ Notification shows correct title and body
- ✅ Clicking notification opens app to /tasks page

## Debugging Commands

### Check Service Worker Status:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(reg => {
    console.log('- Scope:', reg.scope);
    console.log('- Active:', reg.active?.scriptURL);
  });
});
```

### Check Notification Permission:
```javascript
console.log('Notification permission:', Notification.permission);
```

### Check FCM Token:
```javascript
// After enabling notifications
const messaging = firebase.messaging();
const token = await messaging.getToken({
  vapidKey: 'BH5arpn_RZW-cMfEqaei2QO_Q6vG4Cp9gzBvCiZrC_PO8n6l9EuglcLGtAT_zYWqWa6hJSLACpBdUpPdhVc74GM'
});
console.log('FCM Token:', token);
```

### Force Service Worker Update:
```javascript
// Unregister all service workers
const regs = await navigator.serviceWorker.getRegistrations();
for (const reg of regs) {
  await reg.unregister();
}
console.log('All service workers unregistered');
// Reload page
location.reload();
```

## Common Issues and Solutions

### Issue: "No FCM token found"
**Solution**: 
1. Go to /notifications page
2. Click "Enable Notifications"
3. Grant permission
4. Verify token is saved

### Issue: "Failed to send notifications"
**Solution**:
1. Check Firebase Admin SDK credentials in environment variables
2. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly
3. Check Vercel logs for detailed error messages

### Issue: Duplicate notifications
**Solution**:
1. Clear service worker cache (use "Fix SW Issues" button)
2. Verify service worker version is v5.2
3. Check browser console for `[SW v5.2]` logs

### Issue: Notifications not appearing
**Solution**:
1. Check notification permission: `Notification.permission`
2. Verify FCM token exists in Firestore
3. Check browser console for errors
4. Verify service worker is registered and active

## Success Indicators

✅ Server logs show `[Notification Send] ✅ FCM sent to xxx`
✅ Service worker logs show `[SW v5.2] 🔔 Title: New Task Assigned`
✅ User receives notification within 1-2 seconds
✅ Notification format matches requirements
✅ No duplicate notifications
✅ No fallback notifications

---

**Last Updated**: 2026-02-13
**Version**: 2.0
