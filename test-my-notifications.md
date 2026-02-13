# Test If YOU Will Receive Notifications

## Quick Self-Test Checklist

### Step 1: Check Your FCM Token

1. Open Firebase Console → Firestore Database
2. Navigate to `fcmTokens` collection
3. Look for a document with YOUR user ID
4. Verify it has a `token` field with a long string

**If missing:**
- Go to `/notifications` page in your app
- Click "Enable Notifications"
- Grant permission when browser asks

### Step 2: Test Direct Notification Send

Use Postman or curl to send yourself a test notification:

```bash
POST https://your-app.vercel.app/api/notifications/send
Content-Type: application/json

{
  "userIds": ["YOUR_USER_ID_HERE"],
  "title": "Test Notification",
  "body": "If you see this, notifications work!",
  "data": {
    "url": "/notifications",
    "type": "test"
  }
}
```

**Expected result:**
- You should receive a push notification within 1-2 seconds
- Check browser console for any errors

### Step 3: Test Task Assignment

1. Have an admin/manager create a new non-recurring task
2. Assign the task to YOU
3. Wait 1-2 seconds

**Expected result:**
- Push notification appears with:
  - Title: "New Task Assigned"
  - Body: "You have been assigned a new task: [Task Title]"

### Step 4: Check Server Logs

If you have access to server logs (Vercel dashboard), look for:

```
[Task API] Sending notifications to 1 user(s): [YOUR_USER_ID]
[sendNotification] ✅ FCM token found for user YOUR_USER_ID
[sendNotification] ✅ FCM sent to YOUR_USER_ID in 180ms
[Task API] ✅ Notification result: { totalTime: '180ms', sent: 1, errors: 0 }
```

**If you see errors:**
```
[sendNotification] ❌ No FCM token found for user YOUR_USER_ID
```
→ You need to enable notifications at `/notifications` page

## Common Issues & Solutions

### Issue 1: "I don't see the Enable Notifications button"

**Solution:**
- Check if you're on HTTPS (required for notifications)
- Check if your browser supports notifications
- Try a different browser (Chrome recommended)

### Issue 2: "I enabled notifications but still don't receive them"

**Check:**
1. Browser notification permission:
   ```javascript
   // In browser console:
   Notification.permission
   ```
   Should be `"granted"`, not `"denied"` or `"default"`

2. Service worker status:
   ```javascript
   // In browser console:
   navigator.serviceWorker.getRegistrations()
   ```
   Should show at least one active registration

3. FCM token in Firestore:
   - Open Firestore → `fcmTokens` → Your user ID
   - Should have a `token` field

**Solution:**
- Clear browser cache and cookies
- Revisit `/notifications` page
- Re-enable notifications

### Issue 3: "Notifications work on desktop but not mobile"

**For Android:**
- ✅ Should work in Chrome/Samsung Internet
- Make sure Chrome has notification permission in Android settings

**For iOS:**
- ⚠️ iOS Safari doesn't support web push notifications
- ✅ Install the PWA to home screen first
- Then enable notifications

### Issue 4: "I receive notifications but they don't show up"

**Check:**
1. Browser notification settings (not blocked)
2. Operating system notification settings
3. Do Not Disturb mode (disabled)

**For Windows:**
- Settings → System → Notifications → Make sure browser notifications are ON

**For macOS:**
- System Preferences → Notifications → Chrome/Firefox → Allow notifications

**For Android:**
- Settings → Apps → Chrome → Notifications → Enabled

## Test Result Interpretation

| Scenario | Result | Action Needed |
|----------|--------|---------------|
| FCM token exists + Test notification received | ✅ **You WILL receive notifications** | None - you're all set! |
| FCM token exists + No notification received | ⚠️ **Check browser/OS settings** | Enable notifications in browser/OS |
| No FCM token | ❌ **You WON'T receive notifications** | Visit `/notifications` and enable |
| Test notification works + Task notification doesn't | ⚠️ **Check server logs** | May be an API issue |

## Final Verification

After the fix is deployed, create a test task assigned to yourself:

1. Log in as admin/manager (or ask someone to do this)
2. Create a new non-recurring task
3. Assign it to YOUR user account
4. Within 1-2 seconds, you should receive:
   - Push notification on your device
   - Notification entry in Firestore `notifications` collection
   - Notification badge in app header

**If all three happen → ✅ Notifications are working perfectly for you!**
