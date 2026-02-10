# Push Notifications Testing Guide

## Quick Start Testing

### 1. Start Development Server
```bash
npm run dev
```

### 2. Enable Notifications
1. Open browser: `http://localhost:3000/notifications`
2. Click **"Enable Notifications"** button
3. Accept browser permission prompt
4. Check console for FCM token (should see: "FCM Token: ...")

### 3. Test Task Assignment Notification

#### Option A: Using the UI
1. Go to Tasks page: `http://localhost:3000/tasks`
2. Create a new task
3. Assign it to your user
4. Check `/notifications` page for the notification

#### Option B: Using API (Postman/curl)
```bash
# Get your auth token from browser DevTools > Application > Local Storage
# Look for firebase auth token

curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "title": "Test Task",
    "description": "Testing push notifications",
    "dueDate": "2026-03-01",
    "priority": "high",
    "status": "pending",
    "assignedTo": ["YOUR_USER_ID"]
  }'
```

### 4. Verify Notification in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `jpcopanel`
3. Go to **Firestore Database**
4. Check collections:
   - `fcmTokens/{userId}` - Should have your FCM token
   - `notifications/{notificationId}` - Should have notification data

## Testing Scenarios

### ✅ Scenario 1: Foreground Notification (App Open)
**Expected:** Toast notification appears in the app

1. Keep browser tab open on any page
2. Create a task assigned to you (from another browser/device)
3. Should see toast notification appear
4. Click toast to navigate to tasks page

### ✅ Scenario 2: Background Notification (App Minimized)
**Expected:** System notification appears

**⚠️ IMPORTANT:** This requires Cloud Functions to be deployed!

1. Enable notifications in the app
2. Minimize or close the browser tab
3. Create a task assigned to you (from another device)
4. Should see system notification
5. Click notification to open app

### ✅ Scenario 3: Notification History
**Expected:** All notifications appear in list

1. Go to `/notifications` page
2. Should see list of all notifications
3. Unread notifications have blue background
4. Click notification to mark as read
5. Click notification to navigate to task

### ✅ Scenario 4: Multiple Assignees
**Expected:** All assigned users receive notification

1. Create task with multiple assignees
2. Each user should receive notification
3. Check Firestore for multiple notification documents

## Browser Testing

### Chrome/Edge (Desktop)
✅ Full support
- Foreground notifications: ✅
- Background notifications: ✅
- Service worker: ✅

### Firefox (Desktop)
✅ Full support
- Foreground notifications: ✅
- Background notifications: ✅
- Service worker: ✅

### Safari (Desktop)
⚠️ Limited support (macOS 13+)
- Foreground notifications: ✅
- Background notifications: ⚠️ (requires macOS 13+)
- Service worker: ⚠️

### Chrome (Android)
✅ Full support
- Foreground notifications: ✅
- Background notifications: ✅
- Service worker: ✅

### Safari (iOS)
⚠️ Requires PWA installation
- Must add to home screen first
- Then enable notifications
- Background notifications: ⚠️ (iOS 16.4+)

## Debugging

### Check Service Worker Registration
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers**
4. Should see `firebase-messaging-sw.js` registered

### Check FCM Token
1. Open DevTools Console
2. Enable notifications
3. Look for: `FCM Token: ...`
4. Copy token for manual testing

### Check Notification Permission
```javascript
// Run in browser console
console.log('Permission:', Notification.permission);
// Should be: "granted", "denied", or "default"
```

### Check Firestore Data
```javascript
// In browser console (after enabling notifications)
// This checks if your token was saved
fetch('/api/notifications/fcm-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    token: 'YOUR_FCM_TOKEN'
  })
}).then(r => r.json()).then(console.log);
```

## Common Issues

### ❌ "No FCM token available"
**Solution:**
1. Check VAPID key is set in `src/lib/firebase-messaging.ts`
2. Clear browser cache and reload
3. Try incognito mode
4. Check browser console for errors

### ❌ "Service worker registration failed"
**Solution:**
1. Verify `public/firebase-messaging-sw.js` exists
2. Check `next.config.mjs` has correct headers
3. Restart dev server
4. Clear service worker cache (DevTools > Application > Service Workers > Unregister)

### ❌ "Notification permission denied"
**Solution:**
1. Reset browser permissions:
   - Chrome: Settings > Privacy > Site Settings > Notifications
   - Firefox: Settings > Privacy > Permissions > Notifications
2. Remove site from blocked list
3. Reload page and try again

### ❌ Background notifications not working
**Solution:**
1. **Deploy Cloud Functions first!** (See `FCM_PUSH_NOTIFICATIONS_SETUP.md`)
2. Check Cloud Function logs in Firebase Console
3. Verify FCM token is saved in Firestore
4. Test with `sendTestNotification` function

### ❌ CORS errors
**Solution:**
1. Verify `next.config.mjs` has service worker headers
2. Restart dev server
3. Clear browser cache

## Manual Testing with Firebase Console

### Send Test Notification (Without Cloud Functions)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `jpcopanel`
3. Go to **Cloud Messaging**
4. Click **Send your first message**
5. Fill in:
   - **Notification title:** "Test Notification"
   - **Notification text:** "Testing push notifications"
6. Click **Send test message**
7. Paste your FCM token
8. Click **Test**

## Production Testing Checklist

- [ ] VAPID key added to `src/lib/firebase-messaging.ts`
- [ ] Cloud Functions deployed
- [ ] Firestore security rules updated
- [ ] HTTPS enabled on production domain
- [ ] Service worker registered successfully
- [ ] Test on Chrome (Desktop)
- [ ] Test on Chrome (Android)
- [ ] Test on Safari (iOS) - Add to home screen first
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test notification clicks
- [ ] Test multiple assignees
- [ ] Test notification history
- [ ] Monitor Cloud Function logs

## Performance Testing

### Load Testing
```bash
# Test multiple notifications
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/notifications/send \
    -H "Content-Type: application/json" \
    -d '{
      "userIds": ["USER_ID"],
      "title": "Test '$i'",
      "body": "Load test notification '$i'"
    }'
done
```

### Check Notification Delivery Time
1. Note timestamp when task is created
2. Note timestamp when notification appears
3. Should be < 2 seconds for foreground
4. Should be < 5 seconds for background (with Cloud Functions)

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Deploy Cloud Functions
3. ✅ Test on production domain
4. ✅ Monitor for 24 hours
5. ✅ Gather user feedback
6. ✅ Optimize notification content
7. ✅ Add notification preferences

---

## Quick Commands Reference

```bash
# Start dev server
npm run dev

# Check service worker
# Open: http://localhost:3000/notifications
# DevTools > Application > Service Workers

# View Firestore data
# Firebase Console > Firestore Database

# Deploy Cloud Functions
firebase deploy --only functions

# View Cloud Function logs
firebase functions:log

# Test notification API
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"userIds":["USER_ID"],"title":"Test","body":"Test notification"}'
```

---

**Ready to test?** Start with Scenario 1 (Foreground Notification) and work your way through! 🚀
