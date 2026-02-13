# Notification System - Monitoring & Debugging Guide

## Real-time Monitoring

### Vercel Logs (Production)
1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by function: `/api/notifications/send` or `/api/tasks`
3. Look for these patterns:

**Successful Notification:**
```
[Notification Send] Request received: { userIds: ['xxx'], title: 'New Task Assigned', ... }
[Notification Send] Processing user: xxx
[Notification Send] ✅ FCM token found for user xxx
[Notification Send] ✅ FCM sent to xxx in 234ms
[Notification Send] 📬 Batch completed in 245ms (1 sent, 0 errors)
```

**Failed Notification (No Token):**
```
[Notification Send] Processing user: xxx
[Notification Send] ❌ No FCM token found for user xxx
```

**Failed Notification (FCM Error):**
```
[Notification Send] ✅ FCM token found for user xxx
[Notification Send] ❌ FCM failed for xxx: messaging/invalid-registration-token
[Notification Send] 🗑️ Cleaned up expired token for xxx
```

### Browser Console (Client-side)

**Service Worker Logs:**
```
[SW v5.2] ===== PUSH EVENT =====
[SW v5.2] Payload keys: ['data', 'from', 'fcmMessageId']
[SW v5.2] 🔔 Title: New Task Assigned
[SW v5.2] 🔔 Body: You have been assigned a new task: Test Task
[SW v5.2] 🔔 Tag: jpco-task-123
```

**Foreground Message Logs:**
```
[Foreground] Message received: { data: {...}, notification: {...} }
```

**Duplicate Prevention:**
```
[SW v5.2] ⚠️ Duplicate notification prevented: jpco-task-123
```

## Key Metrics to Monitor

### 1. Notification Delivery Rate
**What to track:**
- Number of notifications sent vs. errors
- FCM token availability rate
- Average delivery time

**How to check:**
```javascript
// In Vercel logs, search for:
"[Notification Send] 📬 Batch completed"

// Example output:
// "Batch completed in 245ms (3 sent, 1 errors)"
// Success rate: 3/4 = 75%
```

### 2. FCM Token Coverage
**What to track:**
- Percentage of users with valid FCM tokens
- Token expiration rate

**How to check:**
```javascript
// In Firestore console or via API
const totalUsers = await db.collection('users').count().get();
const tokensCount = await db.collection('fcmTokens').count().get();
const coverage = (tokensCount / totalUsers) * 100;
console.log(`FCM Token Coverage: ${coverage.toFixed(1)}%`);
```

### 3. Notification Errors
**What to track:**
- Invalid/expired token errors
- Permission denied errors
- Network errors

**How to check:**
```javascript
// In Vercel logs, search for:
"[Notification Send] ❌"

// Common error codes:
// - messaging/invalid-registration-token (token expired)
// - messaging/registration-token-not-registered (token deleted)
// - messaging/invalid-argument (malformed request)
```

## Debugging Workflows

### Workflow 1: User Not Receiving Notifications

**Step 1: Check if user has FCM token**
```javascript
// In Firestore console
Collection: fcmTokens
Document ID: [userId]
// Should have 'token' field with long string
```

**Step 2: Check notification was sent**
```javascript
// In Vercel logs, search for:
"[Notification Send] Processing user: [userId]"

// Look for:
// ✅ FCM token found
// ✅ FCM sent
// OR
// ❌ No FCM token found
// ❌ FCM failed
```

**Step 3: Check notification was stored**
```javascript
// In Firestore console
Collection: notifications
Filter: userId == [userId]
Order by: createdAt desc
// Should see recent notification with sent: true
```

**Step 4: Check browser/device**
```javascript
// In browser console
console.log('Notification permission:', Notification.permission);
// Should be 'granted'

// Check service worker
const regs = await navigator.serviceWorker.getRegistrations();
console.log('Service workers:', regs.length);
// Should be 1 with firebase-messaging-sw.js
```

### Workflow 2: Duplicate Notifications

**Step 1: Check service worker version**
```javascript
// In browser console
const regs = await navigator.serviceWorker.getRegistrations();
regs.forEach(reg => {
  console.log('SW:', reg.active?.scriptURL);
});
// Should show firebase-messaging-sw.js

// Check version in SW logs
// Should see [SW v5.2]
```

**Step 2: Check for duplicate prevention logs**
```javascript
// In browser console, look for:
"[SW v5.2] ⚠️ Duplicate notification prevented"
// If you see this, deduplication is working
```

**Step 3: Clear and re-register service worker**
```javascript
// Use "Fix SW Issues" button on /notifications page
// OR manually:
const regs = await navigator.serviceWorker.getRegistrations();
for (const reg of regs) await reg.unregister();
location.reload();
```

### Workflow 3: Fallback Notifications

**Step 1: Check service worker push handler**
```javascript
// In browser console, when notification appears, look for:
"[SW v5.2] ===== PUSH EVENT ====="
// If you DON'T see this, service worker isn't handling push
```

**Step 2: Verify notification display**
```javascript
// Should see:
"[SW v5.2] 🔔 Title: ..."
"[SW v5.2] 🔔 Body: ..."
// If you see generic title/body, push data is malformed
```

**Step 3: Check FCM message format**
```javascript
// In Vercel logs, check notification send:
"[Notification Send] Request received: { userIds: [...], title: '...', body: '...', dataKeys: [...] }"
// Verify title and body are present
```

## Alert Thresholds

### Critical Alerts
- ❌ Notification delivery rate < 50%
- ❌ FCM token coverage < 30%
- ❌ More than 10 errors per hour

### Warning Alerts
- ⚠️ Notification delivery rate < 80%
- ⚠️ FCM token coverage < 60%
- ⚠️ More than 5 errors per hour

### Healthy Metrics
- ✅ Notification delivery rate > 90%
- ✅ FCM token coverage > 70%
- ✅ Less than 2 errors per hour

## Common Error Codes

### messaging/invalid-registration-token
**Meaning**: FCM token is expired or invalid
**Action**: Token is automatically cleaned up, user needs to re-enable notifications
**User Impact**: User won't receive notifications until they re-enable

### messaging/registration-token-not-registered
**Meaning**: FCM token was deleted or never registered
**Action**: Token is automatically cleaned up
**User Impact**: User needs to enable notifications

### messaging/invalid-argument
**Meaning**: Malformed notification request
**Action**: Check notification payload format
**User Impact**: Notification not sent

### messaging/authentication-error
**Meaning**: Firebase Admin SDK credentials invalid
**Action**: Check environment variables
**User Impact**: No notifications sent to anyone

## Health Check Script

```javascript
// Run this in browser console to check notification system health

async function checkNotificationHealth() {
  const results = {
    permission: Notification.permission,
    serviceWorker: null,
    fcmToken: null,
    recentNotifications: null
  };

  // Check service worker
  const regs = await navigator.serviceWorker.getRegistrations();
  results.serviceWorker = {
    count: regs.length,
    active: regs[0]?.active?.scriptURL || 'none'
  };

  // Check FCM token
  try {
    const userId = firebase.auth().currentUser?.uid;
    if (userId) {
      const tokenDoc = await firebase.firestore()
        .collection('fcmTokens')
        .doc(userId)
        .get();
      results.fcmToken = tokenDoc.exists ? 'exists' : 'missing';
    }
  } catch (e) {
    results.fcmToken = 'error: ' + e.message;
  }

  // Check recent notifications
  try {
    const userId = firebase.auth().currentUser?.uid;
    if (userId) {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      const data = await response.json();
      results.recentNotifications = {
        count: data.notifications?.length || 0,
        latest: data.notifications?.[0]?.createdAt || 'none'
      };
    }
  } catch (e) {
    results.recentNotifications = 'error: ' + e.message;
  }

  console.log('Notification System Health:', results);
  
  // Determine overall health
  const isHealthy = 
    results.permission === 'granted' &&
    results.serviceWorker.count === 1 &&
    results.fcmToken === 'exists';
  
  console.log('Overall Health:', isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY');
  
  return results;
}

// Run the check
await checkNotificationHealth();
```

## Maintenance Tasks

### Weekly
- [ ] Check notification delivery rate in Vercel logs
- [ ] Review error logs for patterns
- [ ] Verify FCM token coverage

### Monthly
- [ ] Clean up expired FCM tokens (automatic)
- [ ] Review notification performance metrics
- [ ] Update service worker if needed

### As Needed
- [ ] Clear service worker cache for users reporting issues
- [ ] Re-enable notifications for users with expired tokens
- [ ] Update Firebase Admin SDK credentials if rotated

## Support Playbook

### User Reports: "I'm not getting notifications"

1. **Ask user to check notification permission**
   - Go to /notifications page
   - Check if "Notifications are enabled" is shown
   - If not, click "Enable Notifications"

2. **Check server logs**
   - Search for user's ID in Vercel logs
   - Look for `[Notification Send]` entries
   - Verify FCM token exists and send succeeded

3. **Check Firestore**
   - Verify user has document in `fcmTokens` collection
   - Verify recent notifications in `notifications` collection

4. **Ask user to fix service worker**
   - Go to /notifications page
   - Click "Fix SW Issues" button
   - Try again

### User Reports: "I'm getting duplicate notifications"

1. **Check service worker version**
   - Ask user to open browser console
   - Look for `[SW v5.2]` in logs
   - If not v5.2, ask user to click "Fix SW Issues"

2. **Check for foreground message handler**
   - Look for `[Foreground]` logs in console
   - Should NOT see toast notifications
   - Should only see notification list refresh

3. **Clear service worker cache**
   - Use "Fix SW Issues" button
   - Or manually unregister and reload

---

**Last Updated**: 2026-02-13
**Version**: 2.0
**Status**: Production Ready
