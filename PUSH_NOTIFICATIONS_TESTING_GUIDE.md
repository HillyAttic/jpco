# Push Notifications Testing Guide

## ✅ Deployment Status

All Cloud Functions are successfully deployed:

| Function | Region | Trigger | Status |
|----------|--------|---------|--------|
| `sendPushNotification` | asia-south2 | Firestore onCreate | ✅ Active |
| `updateFCMToken` | asia-south2 | Callable (HTTPS) | ✅ Active |
| `sendTestNotification` | asia-south2 | Callable (HTTPS) | ✅ Active |
| `cleanupOldNotifications` | asia-south1 | Scheduled (daily) | ✅ Active |

## 🧪 How to Test

### Method 1: Test via Firebase Console (Easiest)

1. Open Firebase Console: https://console.firebase.google.com/project/jpcopanel/firestore
2. Navigate to Firestore Database
3. Go to the `notifications` collection
4. Click "Add document"
5. Add the following fields:

```json
{
  "fcmToken": "YOUR_FCM_TOKEN_HERE",
  "title": "Test Notification",
  "body": "This is a test from Firestore",
  "sent": false,
  "createdAt": [Current timestamp],
  "data": {
    "url": "/notifications",
    "type": "test"
  }
}
```

6. The `sendPushNotification` function will trigger automatically
7. Check the function logs in Firebase Console → Functions → Logs

### Method 2: Test via Your App

#### Step 1: Get FCM Token

In your Next.js app, the FCM token is stored when a user enables notifications. To get it:

```typescript
// In your browser console (F12)
// After enabling notifications in your app
const messaging = getMessaging();
const token = await getToken(messaging, { 
  vapidKey: 'YOUR_VAPID_KEY' 
});
console.log('FCM Token:', token);
```

#### Step 2: Call Test Function

Use the Firebase SDK to call the test function:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const sendTest = httpsCallable(functions, 'sendTestNotification');

// Call the function
const result = await sendTest();
console.log('Result:', result.data);
```

Or add a test button in your app:

```tsx
// Add to any page
<button onClick={async () => {
  const functions = getFunctions();
  const sendTest = httpsCallable(functions, 'sendTestNotification');
  const result = await sendTest();
  alert(JSON.stringify(result.data));
}}>
  Send Test Notification
</button>
```

### Method 3: Test via REST API

```bash
# Get your Firebase ID token first
# Then call the function

curl -X POST \
  https://asia-south2-jpcopanel.cloudfunctions.net/sendTestNotification \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json"
```

## 📊 Monitoring

### View Function Logs

```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only sendPushNotification

# Follow logs in real-time
firebase functions:log --follow
```

### Firebase Console Logs

1. Go to: https://console.firebase.google.com/project/jpcopanel/functions
2. Click on any function
3. Click "Logs" tab
4. Filter by severity (Info, Warning, Error)

## 🔍 Troubleshooting

### Notification Not Received

1. **Check FCM Token**
   - Verify the token is valid and not expired
   - Check if the token is stored correctly in Firestore

2. **Check Function Logs**
   ```bash
   firebase functions:log --only sendPushNotification
   ```

3. **Verify Notification Permission**
   - Browser must have notification permission granted
   - Check: `Notification.permission === 'granted'`

4. **Check Service Worker**
   - Service worker must be registered
   - Check in DevTools → Application → Service Workers

### Common Errors

| Error | Solution |
|-------|----------|
| "No FCM token found" | User hasn't enabled notifications yet |
| "Invalid registration token" | Token expired, need to refresh |
| "Permission denied" | Check Firestore security rules |
| "Function not found" | Verify function is deployed: `firebase functions:list` |

## 🎯 Expected Behavior

### When a notification is created in Firestore:

1. `sendPushNotification` function triggers automatically
2. Function validates the FCM token
3. Sends notification via Firebase Cloud Messaging
4. Updates the document with `sent: true` and `sentAt` timestamp
5. User receives push notification in browser

### Notification Document After Sending:

```json
{
  "fcmToken": "...",
  "title": "Test Notification",
  "body": "This is a test",
  "sent": true,
  "sentAt": "2026-02-11T10:30:00Z",
  "messageId": "projects/jpcopanel/messages/1234567890",
  "createdAt": "2026-02-11T10:29:55Z"
}
```

## 🚀 Quick Test Commands

```bash
# List all functions
firebase functions:list

# View logs
firebase functions:log --only sendPushNotification

# Delete test notifications from Firestore
# (Use Firebase Console → Firestore → notifications collection)
```

## 📱 Testing on Mobile

1. Open your PWA on mobile device
2. Enable notifications when prompted
3. Create a test notification via Firebase Console
4. Notification should appear even when app is closed

## ✅ Success Checklist

- [ ] All 4 functions deployed successfully
- [ ] FCM token is being saved to Firestore
- [ ] Test notification can be sent via Firebase Console
- [ ] Notification appears in browser
- [ ] Function logs show successful execution
- [ ] Notification document updated with `sent: true`

## 🔗 Useful Links

- Firebase Console: https://console.firebase.google.com/project/jpcopanel
- Functions Dashboard: https://console.firebase.google.com/project/jpcopanel/functions
- Firestore Database: https://console.firebase.google.com/project/jpcopanel/firestore
- Cloud Build Logs: https://console.cloud.google.com/cloud-build/builds?project=jpcopanel

---

**Next Steps:**
1. Test notification via Firebase Console (Method 1)
2. Verify notification appears in browser
3. Check function logs for any errors
4. Integrate test button in your app UI
