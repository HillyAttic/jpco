# Quick Postman Testing Guide

## Setup (2 minutes)

### Step 1: Import Collection
1. Open Postman
2. Click "Import" button
3. Drag and drop `JPCO_Notifications_Postman_Collection.json`
4. Collection "JPCO Notifications Testing" will appear

### Step 2: Get Firebase Auth Token
1. Open your app in browser: https://jpcopanel.vercel.app
2. Log in as admin/manager
3. Open DevTools Console (F12)
4. Run this command:
```javascript
firebase.auth().currentUser.getIdToken().then(token => {
  console.log('Copy this token:');
  console.log(token);
})
```
5. Copy the token (long string starting with "eyJ...")

### Step 3: Update Collection Variables
1. In Postman, click on the collection "JPCO Notifications Testing"
2. Go to "Variables" tab
3. Update `AUTH_TOKEN` with the token you copied
4. Update `USER_ID` if testing with a different user
5. Click "Save"

## Quick Test (30 seconds)

### Test 1: Check if User Has FCM Token
```
Request: 1. Check FCM Token Status
Click: Send
```

**Expected Result:**
- ✅ If token exists: `"exists": true, "status": "ready"`
- ❌ If no token: `"exists": false` with instructions

### Test 2: Send Test Notification
```
Request: 3. Send Test Notification
Click: Send
```

**Expected Result:**
- ✅ If token exists: `"sent": [{ "userId": "...", "messageId": "..." }]`
- ❌ If no token: `"errors": [{ "userId": "...", "error": "No FCM token" }]`

## Detailed Testing Flow

### Scenario 1: User Has No Token (Most Common Issue)

1. **Check Token Status**
   - Request: `1. Check FCM Token Status`
   - Response: `"exists": false`
   - **Action**: User needs to enable notifications in the app!

2. **Save Test Token** (Optional - for API testing only)
   - Request: `2. Save FCM Token (Simulate Enable)`
   - Response: `"message": "FCM token saved successfully"`
   - **Note**: This is a fake token, won't receive real push

3. **Verify Token Saved**
   - Request: `1. Check FCM Token Status`
   - Response: `"exists": true`

4. **Send Test Notification**
   - Request: `3. Send Test Notification`
   - Response: `"sent": [...]` (will try to send but fail because token is fake)

### Scenario 2: User Has Token (Notifications Should Work)

1. **Check Token Status**
   - Request: `1. Check FCM Token Status`
   - Response: `"exists": true, "hasToken": true`

2. **Send Test Notification**
   - Request: `3. Send Test Notification`
   - Response: `"sent": [{ "userId": "...", "messageId": "..." }]`
   - **Check**: User should receive push notification (if token is real)

3. **Create Task with Notification**
   - Request: `4. Create Task with Notification`
   - Response: Task created successfully
   - **Check**: User should receive push notification

4. **Verify Notification in List**
   - Request: `5. Get User Notifications`
   - Response: List of notifications including the one just sent

## Understanding Responses

### Check Token - Token Exists
```json
{
  "exists": true,
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "hasToken": true,
  "tokenLength": 163,
  "tokenPreview": "eJxVUMtuwjAQ3PsV...",
  "platform": "web",
  "updatedAt": "2024-02-13T10:00:00.000Z",
  "message": "FCM token found - notifications should work",
  "status": "ready"
}
```
**Meaning**: ✅ User has enabled notifications, system is ready

### Check Token - No Token
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
**Meaning**: ❌ User hasn't enabled notifications yet

### Send Notification - Success
```json
{
  "message": "Notifications processed",
  "totalTime": "150ms",
  "sent": [
    {
      "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
      "messageId": "projects/jpcopanel/messages/1234567890",
      "deliveryTime": "150ms"
    }
  ]
}
```
**Meaning**: ✅ Notification sent successfully via FCM

### Send Notification - No Token
```json
{
  "message": "Notifications processed",
  "totalTime": "50ms",
  "sent": [],
  "errors": [
    {
      "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
      "error": "No FCM token"
    }
  ]
}
```
**Meaning**: ❌ Can't send notification because user has no FCM token

## Common Issues

### Issue 1: "Unauthorized" Error
**Cause**: Auth token is missing or expired
**Solution**: 
1. Get a fresh token from browser console
2. Update `AUTH_TOKEN` variable in Postman
3. Try again

### Issue 2: "No FCM token" Error
**Cause**: User hasn't enabled notifications
**Solution**: 
1. User must visit `/notifications` page in the app
2. Click "Enable Notifications"
3. Grant permission
4. Then test again

### Issue 3: Notification Sent but Not Received
**Cause**: Token saved via Postman is fake
**Solution**: 
1. User must enable notifications in the actual browser
2. This generates a REAL FCM token
3. Real tokens can receive push notifications
4. Postman tokens are just for API testing

## What Each Test Proves

| Test | What It Checks | What It Proves |
|------|---------------|----------------|
| Check Token | FCM token exists in Firestore | User has enabled notifications |
| Save Token | API can save tokens | Token save endpoint works |
| Send Notification | API can send to FCM | Notification sending logic works |
| Create Task | Full flow works | Task creation triggers notification |
| Get Notifications | Notification history | Notifications are stored in Firestore |

## Important Notes

1. **Postman can't receive push notifications** - It can only test the API
2. **Fake tokens won't work** - Tokens saved via Postman are for testing API logic only
3. **Real testing requires browser** - User must enable notifications in the actual app
4. **Auth token expires** - Get a fresh token if you get 401 errors
5. **Check server logs** - Vercel logs show detailed notification sending process

## Next Steps After Postman Testing

If Postman tests show:
- ✅ Token exists
- ✅ Notification API returns success
- ❌ But user still doesn't receive notifications

Then check:
1. Is the token real (not from Postman)?
2. Is service worker registered?
3. Is notification permission granted in browser?
4. Check browser console for errors
5. Check Vercel logs for FCM errors

## Quick Diagnosis

Run Request #1 (Check FCM Token Status):

**If `exists: false`**:
→ User needs to enable notifications in the app
→ Visit `/notifications` page and click "Enable Notifications"

**If `exists: true` but notifications don't work**:
→ Check if token is real (not from Postman)
→ Check service worker status
→ Check browser notification permission
→ Check Vercel logs for errors

**If `exists: true` and Postman shows success**:
→ System is working correctly!
→ User should receive notifications when tasks are assigned
