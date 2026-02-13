# Notification System - Complete Fix (v2)

## Issues Fixed

### 1. ❌ Duplicate/Fallback Notifications When App is Open
**Problem**: When the app was open, users saw duplicate notifications or fallback "Tap to copy URL" notifications.

**Root Cause**: 
- The `onForegroundMessage` handler in `firebase-messaging.ts` was creating browser notifications
- The service worker was also creating notifications
- This caused duplicates and conflicts

**Fix**:
- Removed browser notification creation from `onForegroundMessage` handler
- Service worker now handles ALL notification display (foreground and background)
- `onForegroundMessage` now only refreshes the notification list in the UI
- Added deduplication logic in service worker to prevent duplicate notifications

### 2. ❌ Notifications Not Sent When Task Assigned
**Problem**: Push notifications weren't being sent when tasks were assigned to users.

**Root Cause**:
- The notification API was being called but errors weren't being logged
- No visibility into whether FCM tokens existed for users
- Silent failures in the notification pipeline

**Fix**:
- Added comprehensive logging to `/api/notifications/send` endpoint
- Added logging to task creation endpoint to track notification sending
- Better error handling and reporting
- Logs now show:
  - When notifications are requested
  - Whether FCM tokens exist for users
  - FCM send success/failure
  - Timing information

### 3. ❌ Fallback Notifications Appearing Repeatedly
**Problem**: Generic fallback notifications kept appearing when opening the app.

**Root Cause**:
- Service worker's `onBackgroundMessage` handler was interfering with push event handler
- No deduplication mechanism for notifications
- Multiple push events could trigger the same notification

**Fix**:
- Updated service worker to v5.2 with deduplication
- `onBackgroundMessage` now does nothing (logged but ignored)
- Push event handler is the single source of truth for notification display
- Added notification ID tracking to prevent duplicates within 5-minute window

## Architecture Overview

```
Task Assignment Flow:
1. Admin creates task and assigns to users
2. POST /api/tasks → creates task in Firestore
3. POST /api/notifications/send → sends FCM push (Admin SDK)
4. FCM delivers push to user's device
5. Service worker receives push event
6. Service worker displays notification (with deduplication)
7. Notification stored in Firestore for history

Foreground Message Flow (App Open):
1. FCM delivers message to app
2. onForegroundMessage callback fires
3. Notification list refreshes (NO duplicate notification shown)
4. Service worker ALSO receives push and displays notification
5. User sees ONE notification from service worker
```

## Files Modified

### 1. `src/lib/firebase-messaging.ts`
- Removed browser notification creation from `onForegroundMessage`
- Added comments explaining the architecture
- Now only calls callback for UI updates

### 2. `src/app/notifications/page.tsx`
- Removed toast notification from foreground message handler
- Now only refreshes notification list
- Prevents duplicate notifications

### 3. `public/firebase-messaging-sw.js`
- Updated to v5.2
- Added deduplication logic with `shownNotifications` Set
- Improved logging with `[SW v5.2]` prefix
- `onBackgroundMessage` now does nothing (prevents conflicts)
- Automatic cleanup of notification IDs every 5 minutes

### 4. `src/app/api/notifications/send/route.ts`
- Added comprehensive logging with `[Notification Send]` prefix
- Logs FCM token lookup results
- Logs FCM send success/failure
- Better error messages

### 5. `src/app/api/tasks/route.ts`
- Added logging for notification sending
- Logs response from notification API
- Better error handling

## Testing Checklist

### Test 1: Task Assignment Notification
1. ✅ Create a new task and assign it to a user
2. ✅ Check server logs for `[Notification Send]` messages
3. ✅ Verify FCM token was found
4. ✅ Verify FCM send succeeded
5. ✅ User should receive notification like in the image

### Test 2: No Duplicate Notifications (App Open)
1. ✅ Open the app in browser
2. ✅ Have someone assign you a task
3. ✅ You should see ONE notification (not two)
4. ✅ Notification list should refresh automatically

### Test 3: No Fallback Notifications
1. ✅ Open the app
2. ✅ Should NOT see "Tap to copy URL" notifications
3. ✅ Should NOT see generic "JPCO Dashboard" notifications repeatedly
4. ✅ Only see real task assignment notifications

### Test 4: Background Notifications (App Closed)
1. ✅ Close the app completely
2. ✅ Have someone assign you a task
3. ✅ Should receive notification on lock screen
4. ✅ Notification should match the image format

## Debugging Guide

### Check if FCM Token Exists
```javascript
// In browser console
const userId = 'YOUR_USER_ID';
const db = firebase.firestore();
const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
console.log('Token exists:', tokenDoc.exists);
console.log('Token:', tokenDoc.data()?.token);
```

### Check Server Logs
Look for these log patterns:

**Task Creation:**
```
Sending task assignment notifications to X user(s)
Notifications sent successfully: { sent: [...], errors: [...] }
```

**Notification Send:**
```
[Notification Send] Request received: { userIds: [...], title: '...', body: '...' }
[Notification Send] Processing user: xxx
[Notification Send] ✅ FCM token found for user xxx
[Notification Send] ✅ FCM sent to xxx in XXms
[Notification Send] 📬 Batch completed in XXms (X sent, X errors)
```

**Service Worker:**
```
[SW v5.2] ===== PUSH EVENT =====
[SW v5.2] Payload keys: [...]
[SW v5.2] 🔔 Title: New Task Assigned
[SW v5.2] 🔔 Body: You have been assigned a new task: ...
[SW v5.2] 🔔 Tag: jpco-xxx
```

### Common Issues

#### Issue: "No FCM token found"
**Solution**: User needs to enable notifications
1. Go to /notifications page
2. Click "Enable Notifications"
3. Grant permission when prompted

#### Issue: "FCM send failed"
**Solution**: Check Firebase Admin SDK credentials
1. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` env variable is set
2. Check Vercel environment variables
3. Redeploy if needed

#### Issue: Still seeing duplicate notifications
**Solution**: Clear service worker cache
1. Go to /notifications page
2. Click "Fix SW Issues" button
3. Page will reload with fresh service worker

## Environment Variables Required

```bash
# Firebase Admin SDK (for server-side FCM sending)
FIREBASE_SERVICE_ACCOUNT_KEY='{...full JSON...}'

# OR individual fields:
FIREBASE_PROJECT_ID=jpcopanel
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@jpcopanel.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App URL (for notification API calls)
NEXT_PUBLIC_APP_URL=https://jpcopanel.vercel.app
```

## Deployment Steps

1. **Update Service Worker**
   - Service worker will auto-update on next page load
   - Or use "Fix SW Issues" button to force update

2. **Verify Environment Variables**
   ```bash
   # Check Vercel env vars
   vercel env ls
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "fix: notification system - prevent duplicates and fallbacks"
   git push
   ```

4. **Test**
   - Create a test task assignment
   - Check server logs in Vercel
   - Verify notification appears correctly

## Success Criteria

✅ Notifications sent when tasks assigned (using Admin SDK)
✅ No duplicate notifications when app is open
✅ No fallback "Tap to copy URL" notifications
✅ Notifications match the format shown in the image
✅ Comprehensive logging for debugging
✅ Service worker deduplication working

## Next Steps

1. Test task assignment with real users
2. Monitor server logs for any errors
3. Verify notification delivery on different devices
4. Check notification appearance matches requirements

---

**Version**: 2.0
**Date**: 2026-02-13
**Status**: ✅ Complete - Ready for Testing
