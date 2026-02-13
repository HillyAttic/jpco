# Testing Push Notifications with Postman

## Prerequisites

1. **Get Firebase Auth Token**
   - Log in to your app in the browser
   - Open DevTools Console (F12)
   - Run this command:
   ```javascript
   firebase.auth().currentUser.getIdToken().then(token => console.log(token))
   ```
   - Copy the token (it's a long string starting with "eyJ...")

2. **Get User ID**
   - In the same console, run:
   ```javascript
   console.log('User ID:', firebase.auth().currentUser.uid)
   ```
   - Copy the user ID

## Test 1: Check if FCM Token Exists

### Request:
```
Method: GET
URL: https://jpcopanel.vercel.app/api/notifications/fcm-token-check
```

**Note**: This endpoint doesn't exist yet, so let's use Firestore REST API instead:

```
Method: GET
URL: https://firestore.googleapis.com/v1/projects/jpcopanel/databases/(default)/documents/fcmTokens/HEN5EXqthwYTgwxXCLoz7pqFl453
```

### Expected Response (if token exists):
```json
{
  "name": "projects/jpcopanel/databases/(default)/documents/fcmTokens/HEN5EXqthwYTgwxXCLoz7pqFl453",
  "fields": {
    "token": {
      "stringValue": "long-fcm-token-string..."
    },
    "updatedAt": {
      "timestampValue": "2024-02-13T10:00:00Z"
    },
    "platform": {
      "stringValue": "web"
    }
  }
}
```

### Expected Response (if token doesn't exist):
```json
{
  "error": {
    "code": 404,
    "message": "Document not found"
  }
}
```

## Test 2: Save FCM Token (Simulate User Enabling Notifications)

### Request:
```
Method: POST
URL: https://jpcopanel.vercel.app/api/notifications/fcm-token
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "token": "test-fcm-token-from-postman-" + Date.now()
}
```

### Example Body:
```json
{
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "token": "test-fcm-token-from-postman-1707825600000"
}
```

### Expected Response:
```json
{
  "message": "FCM token saved successfully"
}
```

## Test 3: Send Push Notification Directly

### Request:
```
Method: POST
URL: https://jpcopanel.vercel.app/api/notifications/send
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "userIds": ["HEN5EXqthwYTgwxXCLoz7pqFl453"],
  "title": "Test Notification from Postman",
  "body": "This is a test notification sent via Postman API",
  "data": {
    "taskId": "test-task-123",
    "url": "/notifications",
    "type": "test"
  }
}
```

### Expected Response (if token exists):
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

### Expected Response (if no token):
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

## Test 4: Create Task with Notification (Full Flow)

### Request:
```
Method: POST
URL: https://jpcopanel.vercel.app/api/tasks
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_FIREBASE_AUTH_TOKEN_HERE
Body (raw JSON):
{
  "title": "Test Task from Postman",
  "description": "This task was created via Postman to test notifications",
  "dueDate": "2024-02-20T10:00:00Z",
  "priority": "high",
  "status": "pending",
  "assignedTo": ["HEN5EXqthwYTgwxXCLoz7pqFl453"]
}
```

### Expected Response:
```json
{
  "id": "generated-task-id",
  "title": "Test Task from Postman",
  "description": "This task was created via Postman to test notifications",
  "dueDate": "2024-02-20T10:00:00.000Z",
  "priority": "high",
  "status": "pending",
  "assignedTo": ["HEN5EXqthwYTgwxXCLoz7pqFl453"],
  "createdBy": "admin-user-id",
  "createdAt": "2024-02-13T10:00:00.000Z",
  "updatedAt": "2024-02-13T10:00:00.000Z"
}
```

### Check Server Logs:
After this request, check your Vercel logs for:
```
[Task API] Sending notifications to 1 user(s): [ 'HEN5EXqthwYTgwxXCLoz7pqFl453' ]
[Notification Send] Processing user: HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] ✅ FCM token found for user HEN5EXqthwYTgwxXCLoz7pqFl453
[Notification Send] ✅ FCM sent to HEN5EXqthwYTgwxXCLoz7pqFl453 in XXXms
```

## Test 5: Get User's Notifications

### Request:
```
Method: GET
URL: https://jpcopanel.vercel.app/api/notifications?userId=HEN5EXqthwYTgwxXCLoz7pqFl453
Headers:
  Authorization: Bearer YOUR_FIREBASE_AUTH_TOKEN_HERE
```

### Expected Response:
```json
[
  {
    "id": "notification-id-1",
    "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
    "title": "New Task Assigned",
    "body": "You have been assigned a new task: Test Task from Postman",
    "read": false,
    "sent": true,
    "sentAt": "2024-02-13T10:00:00.000Z",
    "createdAt": "2024-02-13T10:00:00.000Z",
    "data": {
      "taskId": "generated-task-id",
      "url": "/tasks",
      "type": "task_assigned"
    }
  }
]
```

## Test 6: Check Specific User's FCM Token Status

### Create a Test Endpoint (Optional)

Add this to `src/app/api/notifications/check-token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const tokenDoc = await adminDb.collection('fcmTokens').doc(userId).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({
        exists: false,
        message: 'No FCM token found for this user',
        userId,
        action: 'User needs to enable notifications at /notifications page'
      });
    }

    const data = tokenDoc.data();
    return NextResponse.json({
      exists: true,
      userId,
      hasToken: !!data?.token,
      tokenLength: data?.token?.length || 0,
      platform: data?.platform || 'unknown',
      updatedAt: data?.updatedAt?.toDate?.() || null,
      message: 'FCM token found - notifications should work'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Then Test:
```
Method: GET
URL: https://jpcopanel.vercel.app/api/notifications/check-token?userId=HEN5EXqthwYTgwxXCLoz7pqFl453
```

### Expected Response (if token exists):
```json
{
  "exists": true,
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "hasToken": true,
  "tokenLength": 163,
  "platform": "web",
  "updatedAt": "2024-02-13T10:00:00.000Z",
  "message": "FCM token found - notifications should work"
}
```

### Expected Response (if no token):
```json
{
  "exists": false,
  "message": "No FCM token found for this user",
  "userId": "HEN5EXqthwYTgwxXCLoz7pqFl453",
  "action": "User needs to enable notifications at /notifications page"
}
```

## Postman Collection Setup

### 1. Create Environment Variables

In Postman, create an environment with these variables:

```
BASE_URL: https://jpcopanel.vercel.app
AUTH_TOKEN: (paste your Firebase auth token here)
USER_ID: HEN5EXqthwYTgwxXCLoz7pqFl453
TEST_FCM_TOKEN: test-fcm-token-{{$timestamp}}
```

### 2. Create Collection

Create a collection called "JPCO Notifications" with these requests:

1. **Check FCM Token**
   - GET `{{BASE_URL}}/api/notifications/check-token?userId={{USER_ID}}`

2. **Save FCM Token**
   - POST `{{BASE_URL}}/api/notifications/fcm-token`
   - Body: `{"userId": "{{USER_ID}}", "token": "{{TEST_FCM_TOKEN}}"}`

3. **Send Test Notification**
   - POST `{{BASE_URL}}/api/notifications/send`
   - Body: See Test 3 above

4. **Create Task with Notification**
   - POST `{{BASE_URL}}/api/tasks`
   - Headers: `Authorization: Bearer {{AUTH_TOKEN}}`
   - Body: See Test 4 above

5. **Get User Notifications**
   - GET `{{BASE_URL}}/api/notifications?userId={{USER_ID}}`
   - Headers: `Authorization: Bearer {{AUTH_TOKEN}}`

## Debugging with Postman

### If notification send fails:

1. **Check Response Body** - Look for error details
2. **Check Status Code**:
   - 200: Success
   - 400: Bad request (missing parameters)
   - 401: Unauthorized (invalid auth token)
   - 404: Not found
   - 500: Server error

3. **Common Errors**:

   **"No FCM token"**
   - User hasn't enabled notifications
   - Solution: Run Test 2 to save a token, or have user enable notifications in the app

   **"Unauthorized"**
   - Auth token is missing or invalid
   - Solution: Get a fresh token from the browser

   **"Invalid registration token"**
   - FCM token is expired or invalid
   - Solution: Have user disable and re-enable notifications

## Complete Test Flow

Run these tests in order:

1. ✅ **Test 6** - Check if token exists
   - If NO → Run Test 2 to save a token
   - If YES → Continue

2. ✅ **Test 3** - Send test notification
   - Should succeed if token exists
   - Check response for success/error

3. ✅ **Test 4** - Create task with notification
   - Should create task AND send notification
   - Check server logs for confirmation

4. ✅ **Test 5** - Get user's notifications
   - Should show the notification in the list
   - Verify it was created

## Expected Results

### If Everything Works:
- Test 6: `exists: true, hasToken: true`
- Test 3: `sent: [{ userId, messageId, deliveryTime }]`
- Test 4: Task created, notification sent
- Test 5: Notification appears in list

### If Token Missing:
- Test 6: `exists: false`
- Test 3: `errors: [{ userId, error: "No FCM token" }]`
- Test 4: Task created, but notification fails
- Test 5: Notification in list with `sent: false, error: "No FCM token"`

## Notes

- FCM tokens are device/browser specific
- Tokens saved via Postman (Test 2) are fake and won't actually receive push notifications
- To test real push notifications, user must enable notifications in the browser
- Postman tests are useful for checking if the API logic works, not for testing actual push delivery
- For real push testing, use the browser and enable notifications properly
