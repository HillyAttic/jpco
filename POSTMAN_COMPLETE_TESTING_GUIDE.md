# Postman Complete Testing Guide

## 📦 Import Postman Collection

1. Open Postman
2. Click "Import" button
3. Select file: `JPCO_Notifications_Postman_Collection.json`
4. Collection will be imported with all test requests

---

## 🔑 Get Firebase Authentication Token

### Method 1: Browser Console
```javascript
// Open browser console on your app (F12)
// Run this command:
firebase.auth().currentUser.getIdToken().then(token => {
  console.log('Token:', token);
  navigator.clipboard.writeText(token);
  console.log('✅ Token copied to clipboard!');
});
```

### Method 2: Network Tab
1. Open DevTools → Network tab
2. Make any API request in your app
3. Find request with `Authorization` header
4. Copy the token after `Bearer `

---

## 🧪 Test Sequence

### Test 1: Check User Token Status

**Request:**
```http
GET http://localhost:3000/api/notifications/check-token?userId=HEN5EXqthwYTgwxXCLoz7pqFl453
```

**No Auth Required** ✅

**Expected Response (Before Enabling):**
```json
{
  "exists": false,
  "message": "No FCM token found for this user",
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "action": "User needs to enable notifications at /notifications page",
  "instructions": [
    "1. Visit /notifications page",
    "2. Click 'Enable Notifications' button",
    "3. Grant permission when browser prompts",
    "4. Token will be automatically saved"
  ]
}
```

**Status Code:** 404 (Not Found)

---

### Test 2: Enable Notifications (Manual Step)

**This must be done in the browser, not Postman:**

1. Login as user: `HEN5EXqthwYTgwxXCLoz7pqFl453`
2. Navigate to: `http://localhost:3000/notifications`
3. Click the blue button: **"Enable Notifications"**
4. Browser will show permission prompt
5. Click **"Allow"**
6. Wait for success message: ✅ "Notifications enabled successfully"

---

### Test 3: Verify Token Saved

**Request:**
```http
GET http://localhost:3000/api/notifications/check-token?userId=HEN5EXqthwYTgwxXCLoz7pqFl453
```

**Expected Response (After Enabling):**
```json
{
  "exists": true,
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "hasToken": true,
  "tokenLength": 163,
  "tokenPreview": "eXYz123...abc789",
  "platform": "web",
  "updatedAt": "2026-02-13T10:30:00.000Z",
  "message": "FCM token found - notifications should work",
  "status": "ready"
}
```

**Status Code:** 200 (OK)

---

### Test 4: Send Test Notification

**Request:**
```http
POST http://localhost:3000/api/notifications/send
Content-Type: application/json
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

**Body:**
```json
{
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "title": "Test Notification from Postman",
  "body": "This is a test notification to verify the system is working",
  "data": {
    "type": "test",
    "url": "/dashboard",
    "timestamp": "2026-02-13T10:30:00.000Z"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "projects/jpco-panel/messages/1234567890"
}
```

**Status Code:** 200 (OK)

**What Should Happen:**
- User receives push notification immediately
- Notification shows title and body
- Clicking notification opens `/dashboard`

---

### Test 5: Create Task with Notification

**Request:**
```http
POST http://localhost:3000/api/tasks
Content-Type: application/json
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

**Body:**
```json
{
  "title": "Test Task from Postman",
  "description": "This task should trigger a notification",
  "priority": "high",
  "status": "pending",
  "dueDate": "2026-02-20T00:00:00.000Z",
  "assignedTo": ["HEN5EXqthwYTgwxXCLoz7pqFl453"],
  "categoryId": "some-category-id",
  "teamId": "some-team-id"
}
```

**Expected Response:**
```json
{
  "id": "task-id-123",
  "title": "Test Task from Postman",
  "status": "pending",
  "createdAt": "2026-02-13T10:30:00.000Z",
  ...
}
```

**Status Code:** 201 (Created)

**What Should Happen:**
1. Task is created in Firestore
2. Cloud Function trigger fires
3. Notification sent to user `HEN5EXqthwYTgwxXCLoz7pqFl453`
4. User receives push notification with task details

**Server Logs to Check:**
```
[Task API] 📤 Sending notification to user: HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] ✅ Notification sent successfully
```

---

### Test 6: Check Recurring Tasks API

**Request:**
```http
GET http://localhost:3000/api/recurring-tasks
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

**Expected Response:**
```json
[
  {
    "id": "recurring-task-1",
    "title": "Monthly Report",
    "recurrencePattern": "monthly",
    "nextOccurrence": "2026-03-01T00:00:00.000Z",
    ...
  }
]
```

**Status Code:** 200 (OK)

**Server Logs to Check:**
```
[Recurring Tasks API] ✅ User profile loaded for HEN5EXqthwYTgwxXCLoz7pqFl453, role: employee
[Recurring Tasks API] Team member HEN5EXqthwYTgwxXCLoz7pqFl453 filtered recurring tasks: 1
```

**Should NOT See:**
```
❌ Error getting user profile: [Error [FirebaseError]: Missing or insufficient permissions.]
```

---

## 🔍 Troubleshooting

### Issue: 401 Unauthorized

**Cause:** Invalid or expired Firebase token

**Solution:**
1. Get a fresh token from browser console
2. Update Authorization header in Postman
3. Retry request

### Issue: Token Not Found (404)

**Cause:** User hasn't enabled notifications

**Solution:**
1. Login as the user in browser
2. Visit `/notifications` page
3. Click "Enable Notifications"
4. Grant permission
5. Retry Test 3

### Issue: Notification Not Received

**Possible Causes:**
1. Browser notification permission denied
2. Service worker not registered
3. FCM token not saved
4. Browser tab closed

**Solution:**
1. Check browser notification settings
2. Visit `/notifications` and click "Fix SW Issues"
3. Re-enable notifications
4. Keep browser tab open
5. Check browser console for errors

### Issue: 500 Internal Server Error

**Cause:** Server-side error

**Solution:**
1. Check server console logs
2. Look for error messages with `[Notification Send]` prefix
3. Verify Firebase Admin SDK is initialized
4. Check Firestore rules are deployed

---

## 📊 Expected Server Logs

### Successful Notification Flow
```
[Task API] 📤 Sending notification to user: HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] 📝 Notification request: {
  userId: 'HEN5EXqthwYTgwxXCLoz7pqFl453',
  title: 'New Task Assigned',
  body: 'Test Task from Postman'
}
[Notification Send] 🔍 Checking FCM token for user: HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] ✅ FCM token found
[Notification Send] 📤 Sending to FCM...
[Notification Send] ✅ Notification sent successfully
[Notification Send] 📨 Message ID: projects/jpco-panel/messages/1234567890
```

### Failed Notification (No Token)
```
[Task API] 📤 Sending notification to user: HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] 📝 Notification request: {...}
[Notification Send] 🔍 Checking FCM token for user: HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] ❌ No FCM token found for user HEN5EXqthwYTgwxXCLoz7pqFl453
```

---

## ✅ Success Criteria

### All Tests Pass When:

1. ✅ Test 1: Returns 404 before enabling (expected)
2. ✅ Test 2: User successfully enables notifications in browser
3. ✅ Test 3: Returns 200 with token details
4. ✅ Test 4: Returns 200 with messageId, user receives notification
5. ✅ Test 5: Returns 201, task created, user receives notification
6. ✅ Test 6: Returns 200 with tasks, no permission errors

### System is Working When:

- ✅ No permission errors in console
- ✅ Service worker registered successfully
- ✅ FCM token saved in Firestore
- ✅ Notifications received in browser
- ✅ Server logs show successful sends
- ✅ Cloud Functions trigger correctly

---

## 🎯 Quick Test Checklist

- [ ] Import Postman collection
- [ ] Get Firebase auth token
- [ ] Run Test 1 (check token - should be 404)
- [ ] Enable notifications in browser
- [ ] Run Test 3 (verify token - should be 200)
- [ ] Run Test 4 (send test notification)
- [ ] Verify notification received
- [ ] Run Test 5 (create task with notification)
- [ ] Verify task notification received
- [ ] Run Test 6 (check recurring tasks API)
- [ ] Verify no permission errors

---

## 📝 Notes

- Keep browser tab open to receive notifications
- Service worker must be registered (check console)
- Notifications only work on HTTPS or localhost
- FCM token expires after ~2 months (auto-refreshed)
- Cloud Functions may have cold start delay (~5 seconds)

---

## 🆘 Need Help?

Check these files:
- `COMPLETE_FIX_APPLIED.md` - Full fix documentation
- `NOTIFICATION_SYSTEM_STATUS_FINAL.md` - System status
- `QUICK_FIX_SUMMARY.md` - Quick reference
- `HOW_TO_FIX_NOTIFICATIONS_NOW.md` - User instructions

---

**Status:** Ready for testing ✅
