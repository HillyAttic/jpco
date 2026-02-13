# Notification System - Quick Fix Reference

## 🚨 Quick Diagnosis

### Problem: User not getting notifications
```bash
# Check 1: Does user have FCM token?
# In Firestore: fcmTokens/{userId} should exist

# Check 2: Check server logs
# Search for: "[Notification Send] Processing user: {userId}"
# Should see: "✅ FCM token found" and "✅ FCM sent"

# Check 3: User needs to enable notifications
# Go to /notifications page → Click "Enable Notifications"
```

### Problem: Duplicate notifications
```bash
# Check 1: Service worker version
# Browser console should show: [SW v5.2]

# Check 2: Clear service worker
# Go to /notifications → Click "Fix SW Issues"

# Check 3: Verify no toast notifications
# Should NOT see toast when notification arrives
```

### Problem: Fallback notifications
```bash
# Check 1: Service worker handling push
# Browser console should show: [SW v5.2] ===== PUSH EVENT =====

# Check 2: Clear and re-register service worker
# Use "Fix SW Issues" button

# Check 3: Verify notification format
# Should show "New Task Assigned", not generic message
```

## 🔍 Quick Checks

### Server Side (Vercel Logs)
```
✅ GOOD:
[Notification Send] ✅ FCM token found for user xxx
[Notification Send] ✅ FCM sent to xxx in 234ms
[Notification Send] 📬 Batch completed in 245ms (1 sent, 0 errors)

❌ BAD:
[Notification Send] ❌ No FCM token found for user xxx
[Notification Send] ❌ FCM failed for xxx: invalid-registration-token
```

### Client Side (Browser Console)
```
✅ GOOD:
[SW v5.2] ===== PUSH EVENT =====
[SW v5.2] 🔔 Title: New Task Assigned
[SW v5.2] 🔔 Body: You have been assigned a new task: ...
[Foreground] Message received: {...}

❌ BAD:
[SW v5.1] ... (old version)
No [SW v5.2] logs (service worker not working)
Multiple notifications for same task (duplicates)
```

## 🛠️ Quick Fixes

### Fix 1: User Enable Notifications
```
1. Go to /notifications page
2. Click "Enable Notifications"
3. Grant permission when prompted
4. Verify "Notifications are enabled" appears
```

### Fix 2: Clear Service Worker
```
1. Go to /notifications page
2. Click "Fix SW Issues" button
3. Page will reload
4. Test again
```

### Fix 3: Check Environment Variables
```bash
# In Vercel dashboard or .env.local
FIREBASE_SERVICE_ACCOUNT_KEY='{...}'
NEXT_PUBLIC_APP_URL=https://jpcopanel.vercel.app
```

### Fix 4: Manual Service Worker Clear
```javascript
// In browser console
const regs = await navigator.serviceWorker.getRegistrations();
for (const reg of regs) await reg.unregister();
location.reload();
```

## 📊 Health Check (30 seconds)

```javascript
// Run in browser console
async function quickHealthCheck() {
  const checks = {
    permission: Notification.permission === 'granted' ? '✅' : '❌',
    serviceWorker: (await navigator.serviceWorker.getRegistrations()).length === 1 ? '✅' : '❌',
    fcmToken: 'checking...'
  };
  
  try {
    const userId = firebase.auth().currentUser?.uid;
    const tokenDoc = await firebase.firestore().collection('fcmTokens').doc(userId).get();
    checks.fcmToken = tokenDoc.exists ? '✅' : '❌';
  } catch (e) {
    checks.fcmToken = '❌';
  }
  
  console.table(checks);
  const healthy = Object.values(checks).every(v => v === '✅');
  console.log(healthy ? '✅ SYSTEM HEALTHY' : '❌ ISSUES DETECTED');
}

await quickHealthCheck();
```

## 🎯 Expected Behavior

### When Task Assigned
```
1. Admin creates task (assigns to user)
2. Within 1-2 seconds: User receives notification
3. Notification shows:
   - Title: "New Task Assigned"
   - Body: "You have been assigned a new task: [title]"
   - Icon: JPCO logo
   - Actions: View, Dismiss
4. Clicking "View" opens app to /tasks
5. Notification list updates automatically
```

### When App is Open
```
1. Notification arrives
2. Service worker displays notification
3. Notification list refreshes
4. NO toast notification
5. NO duplicate notification
6. User sees ONE notification
```

### When App is Closed
```
1. Notification arrives
2. Appears on lock screen/desktop
3. Clicking opens app
4. Navigates to /tasks
```

## 🚀 Quick Test

```bash
# Test 1: Send test notification
curl -X POST "http://localhost:3000/api/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["USER_ID_HERE"],
    "title": "Test Notification",
    "body": "Testing notification system",
    "data": { "type": "test", "url": "/notifications" }
  }'

# Test 2: Create task (in app)
# Go to /tasks → Create Task → Assign to user → Submit

# Test 3: Check logs
# Vercel logs → Search for "[Notification Send]"
```

## 📞 Support Quick Links

- **Full Fix Details**: `NOTIFICATION_FIX_COMPLETE_V2.md`
- **Testing Guide**: `test-notification-system.md`
- **Monitoring**: `NOTIFICATION_MONITORING_GUIDE.md`
- **Flow Diagram**: `NOTIFICATION_FLOW_DIAGRAM.md`

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `src/lib/firebase-messaging.ts` | FCM initialization, foreground handler |
| `public/firebase-messaging-sw.js` | Service worker (v5.2), notification display |
| `src/app/api/notifications/send/route.ts` | Send notifications (Admin SDK) |
| `src/app/api/tasks/route.ts` | Create tasks, trigger notifications |
| `src/app/notifications/page.tsx` | Enable/disable notifications UI |

## ✅ Success Indicators

- ✅ Logs show `[Notification Send] ✅ FCM sent`
- ✅ Browser shows `[SW v5.2] 🔔 Title: New Task Assigned`
- ✅ User receives notification within 1-2 seconds
- ✅ Notification format matches requirements
- ✅ No duplicates
- ✅ No fallbacks

## ❌ Failure Indicators

- ❌ Logs show `[Notification Send] ❌ No FCM token`
- ❌ Browser shows old version `[SW v5.1]`
- ❌ Multiple notifications for same task
- ❌ Generic "JPCO Dashboard" notifications
- ❌ "Tap to copy URL" notifications

---

**Version**: 2.0
**Last Updated**: 2026-02-13
**Status**: Production Ready
