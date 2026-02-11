# 🧪 Push Notifications Testing Script

## Current Issues to Debug

Based on your report that foreground and background notifications aren't working, let's systematically test each component.

---

## ✅ Pre-Test Checklist

Before testing, verify these prerequisites:

```bash
# 1. Check if functions are deployed
firebase functions:list

# 2. Check function logs
firebase functions:log --only sendPushNotification

# 3. Start your dev server
npm run dev
```

---

## 🔍 Test 1: Service Worker Registration

**Purpose:** Verify the service worker is registered correctly

### Steps:

1. Open your app: `http://localhost:3000`
2. Open DevTools (F12) → Application tab → Service Workers
3. Check if `firebase-messaging-sw.js` is registered

### Expected Result:
- ✅ Service worker status: "activated and is running"
- ✅ Source: `/firebase-messaging-sw.js`

### If Failed:
```javascript
// Run in browser console to check service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
  registrations.forEach(reg => {
    console.log('SW:', reg.active?.scriptURL);
  });
});
```

**Fix if not registered:**
- Check if `public/firebase-messaging-sw.js` exists
- Verify the file is accessible at `http://localhost:3000/firebase-messaging-sw.js`
- Clear browser cache and reload

---

## 🔍 Test 2: FCM Token Generation

**Purpose:** Verify FCM token is generated and saved

### Steps:

1. Go to: `http://localhost:3000/notifications`
2. Click "Enable Notifications"
3. Grant permission when prompted
4. Open browser console (F12)

### Expected Console Output:
```
Notification permission granted
FCM Token: [long token string]
FCM token saved successfully
```

### Verify in Firestore:
1. Go to: https://console.firebase.google.com/project/jpcopanel/firestore
2. Navigate to `fcmTokens` collection
3. Find document with your userId
4. Verify `token` field exists

### If Failed:

**Check VAPID key:**
```javascript
// Run in console
console.log('VAPID Key:', 'BH5arpn_RZW-cMfEqaei2QO_Q6vG4Cp9gzBvCiZrC_PO8n6l9EuglcLGtAT_zYWqWa6hJSLACpBdUpPdhVc74GM');
```

**Verify Firebase config:**
```javascript
// Run in console
import { getMessaging } from 'firebase/messaging';
const messaging = getMessaging();
console.log('Messaging initialized:', !!messaging);
```

---

## 🔍 Test 3: Foreground Notifications

**Purpose:** Test notifications when app is open

### Steps:

1. Keep your app open at `http://localhost:3000/notifications`
2. Open browser console (F12) to see logs
3. In a new tab, open Firebase Console: https://console.firebase.google.com/project/jpcopanel/firestore
4. Go to `notifications` collection
5. Click "Add document"
6. Use this data:

```json
{
  "fcmToken": "[YOUR_FCM_TOKEN_FROM_CONSOLE]",
  "userId": "[YOUR_USER_ID]",
  "title": "Foreground Test",
  "body": "Testing foreground notification",
  "sent": false,
  "read": false,
  "createdAt": [Click "Set to current time"],
  "data": {
    "url": "/notifications",
    "type": "test"
  }
}
```

### Expected Result:
1. ✅ Console shows: "Foreground message received: [payload]"
2. ✅ Toast notification appears in app
3. ✅ Notification appears in the list on the page
4. ✅ Firestore document updates with `sent: true`

### Debug Console Commands:

```javascript
// Check if foreground listener is active
console.log('Messaging:', firebase.messaging());

// Manually trigger a test
const testPayload = {
  notification: {
    title: "Manual Test",
    body: "Testing foreground handler"
  },
  data: {
    url: "/notifications"
  }
};
console.log('Test payload:', testPayload);
```

---

## 🔍 Test 4: Background Notifications

**Purpose:** Test notifications when app is closed or in background

### Steps:

1. **First, get your FCM token:**
   - Go to `http://localhost:3000/notifications`
   - Enable notifications
   - Copy FCM token from console

2. **Close or minimize your browser tab** (or switch to another tab)

3. **Create notification in Firestore:**
   - Go to: https://console.firebase.google.com/project/jpcopanel/firestore
   - Navigate to `notifications` collection
   - Add document with:

```json
{
  "fcmToken": "[YOUR_FCM_TOKEN]",
  "userId": "[YOUR_USER_ID]",
  "title": "Background Test",
  "body": "Testing background notification",
  "sent": false,
  "read": false,
  "createdAt": [Current timestamp],
  "data": {
    "url": "/notifications",
    "type": "test"
  }
}
```

### Expected Result:
1. ✅ System notification appears (Windows notification center or browser notification)
2. ✅ Clicking notification opens the app
3. ✅ Firestore document updates with `sent: true`

### If Failed - Check Service Worker Console:

1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Click on the service worker
4. Check console for errors

**Or run this in console:**
```javascript
navigator.serviceWorker.ready.then(registration => {
  console.log('Service Worker Ready:', registration);
  console.log('Push Manager:', registration.pushManager);
});
```

---

## 🔍 Test 5: Cloud Function Execution

**Purpose:** Verify the Cloud Function is triggering and sending notifications

### Steps:

1. Create a test notification in Firestore (as above)
2. Immediately run:

```bash
firebase functions:log --only sendPushNotification --follow
```

### Expected Log Output:
```
New notification created: [notificationId]
Notification sent successfully: projects/jpcopanel/messages/[messageId]
```

### If Failed - Common Errors:

| Error | Cause | Solution |
|-------|-------|----------|
| "No FCM token found" | Missing `fcmToken` field | Add `fcmToken` to document |
| "Invalid registration token" | Token expired | Get fresh token |
| "Requested entity was not found" | Wrong project | Verify Firebase project ID |
| No logs at all | Function not triggering | Check Firestore trigger setup |

---

## 🔍 Test 6: Complete End-to-End Test

**Purpose:** Test the complete notification flow

### Automated Test Script:

Create this file: `test-notification.js`

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path-to-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testNotification() {
  try {
    // Get a user's FCM token
    const tokensSnapshot = await db.collection('fcmTokens').limit(1).get();
    
    if (tokensSnapshot.empty) {
      console.error('No FCM tokens found. Please enable notifications in the app first.');
      return;
    }

    const tokenDoc = tokensSnapshot.docs[0];
    const fcmToken = tokenDoc.data().token;
    const userId = tokenDoc.id;

    console.log('Testing notification for user:', userId);

    // Create a test notification
    const notificationRef = await db.collection('notifications').add({
      fcmToken: fcmToken,
      userId: userId,
      title: 'Automated Test Notification',
      body: 'This is an automated test from the test script',
      sent: false,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        url: '/notifications',
        type: 'test'
      }
    });

    console.log('Test notification created:', notificationRef.id);
    console.log('Waiting for Cloud Function to process...');

    // Wait and check if it was sent
    setTimeout(async () => {
      const doc = await notificationRef.get();
      const data = doc.data();
      
      if (data.sent) {
        console.log('✅ SUCCESS! Notification was sent.');
        console.log('Message ID:', data.messageId);
      } else {
        console.log('❌ FAILED! Notification was not sent.');
        console.log('Error:', data.error);
      }
      
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testNotification();
```

**Run the test:**
```bash
node test-notification.js
```

---

## 🐛 Common Issues & Fixes

### Issue 1: No notifications at all

**Diagnosis:**
```bash
# Check if functions are deployed
firebase functions:list

# Check function logs
firebase functions:log --only sendPushNotification
```

**Fix:**
```bash
# Redeploy functions
firebase deploy --only functions
```

### Issue 2: Foreground works, background doesn't

**Cause:** Service worker not handling messages

**Fix:**
1. Check if `firebase-messaging-sw.js` is accessible
2. Verify service worker is registered
3. Clear browser cache and re-register service worker

```javascript
// Unregister and re-register service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
// Then reload page
```

### Issue 3: Background works, foreground doesn't

**Cause:** Foreground listener not set up

**Fix:** Check if `onForegroundMessage` is called in your component

```typescript
// In your component
useEffect(() => {
  const unsubscribe = onForegroundMessage((payload) => {
    console.log('Foreground message:', payload);
    // Show notification
  });
  return unsubscribe;
}, []);
```

### Issue 4: Token not saving to Firestore

**Diagnosis:**
```javascript
// Check API endpoint
fetch('/api/notifications/fcm-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    userId: 'test-user-id', 
    token: 'test-token' 
  })
}).then(r => r.json()).then(console.log);
```

**Fix:** Check Firestore security rules allow writes to `fcmTokens` collection

### Issue 5: Notifications not appearing in system tray

**Cause:** Browser notification permission or OS settings

**Fix:**
1. Check browser notification settings
2. Check OS notification settings (Windows/Mac)
3. Verify notification permission: `console.log(Notification.permission)`

---

## 📊 Verification Checklist

After running all tests, verify:

- [ ] Service worker registered and active
- [ ] FCM token generated and saved to Firestore
- [ ] Foreground notifications appear as toast in app
- [ ] Background notifications appear in system tray
- [ ] Clicking notification opens correct URL
- [ ] Cloud Function logs show successful sends
- [ ] Firestore documents update with `sent: true`
- [ ] Notifications appear in notifications list

---

## 🚀 Quick Debug Commands

```bash
# Check function deployment
firebase functions:list

# Watch function logs in real-time
firebase functions:log --follow

# Check specific function
firebase functions:log --only sendPushNotification

# Test function locally (if configured)
firebase emulators:start --only functions,firestore
```

---

## 📞 Need Help?

If tests still fail, provide:
1. Browser console logs (F12 → Console)
2. Service worker console logs (F12 → Application → Service Workers)
3. Firebase function logs (`firebase functions:log`)
4. Screenshot of Firestore notification document
5. Network tab showing API calls (F12 → Network)

---

## Next Steps

Run tests in this order:
1. ✅ Test 1: Service Worker
2. ✅ Test 2: FCM Token
3. ✅ Test 3: Foreground
4. ✅ Test 4: Background
5. ✅ Test 5: Cloud Function
6. ✅ Test 6: End-to-End

Report which test fails and I'll help debug specifically!
