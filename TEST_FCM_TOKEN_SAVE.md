# Quick Test: Verify FCM Token is Being Saved

## The 403 Error is Normal - Let's Verify Token is Actually Saved

The 403 error you see in the Network tab is from Firebase Client SDK's internal calls. Your app uses a different method (API route with Admin SDK) that works correctly.

---

## Test 1: Check Server Logs

### When User Enables Notifications

**Look for this in your server console:**
```
FCM token saved for user HEN5EXqthwYTgwxXCLoz7pqFl453
```

**If you see this:** ✅ Token is saved successfully (ignore the 403 error)

**If you don't see this:** ❌ There's a real problem

---

## Test 2: Use Postman to Check Token

### Request
```http
GET http://localhost:3000/api/notifications/check-token?userId=HEN5EXqthwYTgwxXCLoz7pqFl453
```

### Expected Response (Token Saved)
```json
{
  "exists": true,
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "hasToken": true,
  "tokenLength": 163,
  "tokenPreview": "eXYz123...abc789",
  "platform": "web",
  "message": "FCM token found - notifications should work",
  "status": "ready"
}
```

### Expected Response (Token NOT Saved)
```json
{
  "exists": false,
  "message": "No FCM token found for this user",
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "action": "User needs to enable notifications at /notifications page"
}
```

---

## Test 3: Check Browser Console

### When User Clicks "Enable Notifications"

**Look for these logs:**
```
Notification permission granted
FCM Token obtained: eXYz123...
FCM Token: eXYz123...
FCM token saved successfully
```

**If you see these:** ✅ Everything is working

**If you see errors:** ❌ Check the error message

---

## Test 4: Check Firestore Console

### Steps
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `jpcopanel`
3. Click "Firestore Database" in left menu
4. Look for collection: `fcmTokens`
5. Look for document: `HEN5EXqthwYTgwxXCLoz7pqFl453`

### Expected Data
```json
{
  "token": "eXYz123abc456def789...",
  "updatedAt": "February 13, 2026 at 4:50:00 PM UTC",
  "platform": "web"
}
```

**If you see this:** ✅ Token is saved in Firestore

**If collection/document doesn't exist:** ❌ Token not saved

---

## Test 5: Send Test Notification

### Using Postman

**Request:**
```http
POST http://localhost:3000/api/notifications/send
Content-Type: application/json
Authorization: Bearer YOUR_FIREBASE_TOKEN

{
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "title": "Test Notification",
  "body": "Testing if notifications work",
  "data": {
    "type": "test",
    "url": "/dashboard"
  }
}
```

**Expected Response (Token Exists):**
```json
{
  "success": true,
  "messageId": "projects/jpco-panel/messages/1234567890"
}
```

**Expected Response (No Token):**
```json
{
  "success": false,
  "error": "No FCM token found for user"
}
```

---

## Understanding the 403 Error

### What You See in Network Tab
```
GET https://firestore.googleapis.com/v1/projects/jpcopanel/databases/(default)/documents/fcmTokens/HEN5EXqthwYTgwxXCLoz7pqFl453
Status: 403 Forbidden
```

### Why This Happens
1. Firebase Client SDK makes internal REST API calls
2. These calls use user's JWT token
3. Your Firestore security rules block these calls
4. **This is correct behavior!**

### Why It Doesn't Matter
Your app doesn't use these calls! It uses:
```
Browser → /api/notifications/fcm-token → Admin SDK → Firestore
```

This path **bypasses security rules** and works perfectly.

---

## Troubleshooting

### If Token is NOT Being Saved

#### Check 1: API Route Response
Open browser console and look for:
```javascript
// Success
FCM token saved successfully

// Error
Error saving FCM token: ...
```

#### Check 2: Network Tab
Look for request to `/api/notifications/fcm-token`:
```
POST /api/notifications/fcm-token
Status: 200 OK
Response: { "message": "FCM token saved successfully" }
```

#### Check 3: Server Console
Look for:
```
FCM token saved for user HEN5EXqthwYTgwxXCLoz7pqFl453
```

#### Check 4: Admin SDK Initialization
Verify Admin SDK is initialized:
```typescript
// src/lib/firebase-admin.ts should export adminDb
export const adminDb = admin.firestore();
```

---

## Quick Verification Script

### Run in Browser Console

```javascript
// After enabling notifications, run this:
fetch('/api/notifications/check-token?userId=HEN5EXqthwYTgwxXCLoz7pqFl453')
  .then(r => r.json())
  .then(data => {
    if (data.exists) {
      console.log('✅ Token is saved!');
      console.log('Token length:', data.tokenLength);
      console.log('Platform:', data.platform);
      console.log('Status:', data.status);
    } else {
      console.log('❌ Token NOT saved');
      console.log('Action:', data.action);
    }
  });
```

---

## Expected Flow

### Step 1: User Enables Notifications
```
1. User clicks "Enable Notifications"
2. Browser shows permission prompt
3. User clicks "Allow"
4. Firebase generates FCM token
5. App calls: POST /api/notifications/fcm-token
6. API route uses Admin SDK to save token
7. Server logs: "FCM token saved for user..."
8. Browser shows: "Notifications enabled successfully!"
```

### Step 2: Verify Token Saved
```
1. Run Postman: GET /api/notifications/check-token?userId=...
2. Response: { "exists": true, "status": "ready" }
3. ✅ Token is saved!
```

### Step 3: Test Notification
```
1. Admin assigns task to user
2. Cloud Function triggers
3. Function reads token using Admin SDK
4. Notification sent via FCM
5. User receives push notification
6. ✅ Notifications working!
```

---

## Summary

### The 403 Error
- ❌ **NOT** a problem
- ✅ Shows security rules are working
- ✅ Can be safely ignored
- ✅ Doesn't affect functionality

### Your App
- ✅ Uses correct architecture
- ✅ API route with Admin SDK
- ✅ Bypasses security rules
- ✅ Saves tokens successfully

### What to Check
1. ✅ Server logs show "FCM token saved"
2. ✅ Postman returns `"exists": true`
3. ✅ Firestore Console shows token document
4. ✅ Test notification is received

### If All Pass
🎉 **System is working perfectly!**

The 403 error is just noise from Firebase Client SDK's internal calls. Your app uses a different path that works correctly.

---

**Next Step:** Run the Postman test to verify the token is actually saved, then test by assigning a task to the user.
