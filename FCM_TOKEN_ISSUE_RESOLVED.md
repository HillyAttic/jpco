# FCM Token Issue - Resolved

## Issue
Push notifications not working for user `HEN5EXqthwYTgwxXCLoz7pqFl453` (Naveen) with error:
```
[Notification Send] ❌ No FCM token found for user HEN5EXqthwYTgwxXCLoz7pqFl453
```

## Root Cause
The user hasn't registered their FCM (Firebase Cloud Messaging) token yet. This happens when:
1. User hasn't visited the `/notifications` page
2. User hasn't granted notification permissions
3. User's browser doesn't support notifications

## Fixes Applied

### 1. Fixed Recurring Tasks API - Client SDK to Admin SDK Migration
**File**: `src/app/api/recurring-tasks/route.ts`

**Problem**: The API was using Client SDK to query users by email, which was subject to Firestore security rules and causing permission errors.

**Solution**: Migrated to Admin SDK for all Firestore queries:

```typescript
// BEFORE (Client SDK - Permission Denied)
const usersRef = firestoreCollection(db, 'users');
const emailQuery = firestoreQuery(usersRef, firestoreWhere('email', '==', userProfile.email));
const usersSnapshot = await firestoreGetDocs(emailQuery);

// AFTER (Admin SDK - Works)
const usersRef = adminDb.collection('users');
const emailQuery = usersRef.where('email', '==', userProfile.email);
const usersSnapshot = await emailQuery.get();
```

### 2. Verified FCM Token Infrastructure
All FCM token-related APIs are already using Admin SDK correctly:
- ✅ `/api/notifications/fcm-token` (POST/DELETE) - Uses Admin SDK
- ✅ `/api/notifications/send` - Uses Admin SDK to fetch tokens
- ✅ Token storage in `fcmTokens` collection - Uses Admin SDK

## How FCM Token Registration Works

### User Flow:
1. User visits `/notifications` page
2. User clicks "Enable Notifications" button
3. Browser requests notification permission
4. If granted, FCM token is generated
5. Token is saved to Firestore via `/api/notifications/fcm-token`
6. Token is stored in `fcmTokens/{userId}` collection

### Code Flow:
```typescript
// 1. Request permission and get token
const token = await requestNotificationPermission();

// 2. Save to Firestore via API (uses Admin SDK)
const saved = await saveFCMToken(user.uid, token);

// 3. Token stored in fcmTokens collection
// fcmTokens/{userId} = { token, updatedAt, platform: 'web' }
```

## Solution for User

The user needs to:
1. Visit the `/notifications` page
2. Click "Enable Notifications" button
3. Grant notification permission when browser prompts
4. Token will be automatically saved

## Verification

To verify FCM token is saved:
1. Check Firestore console: `fcmTokens/{userId}`
2. Check browser console for: `FCM token saved successfully`
3. Test notification by creating a task assigned to the user

## Architecture Summary

### Before (BROKEN):
```
Client → API Route → Client SDK → Firestore (PERMISSION DENIED)
```

### After (FIXED):
```
Client → API Route → Admin SDK → Firestore (BYPASSES RULES)
```

## Files Modified
1. `src/app/api/recurring-tasks/route.ts` - Migrated user email queries to Admin SDK
2. All other notification APIs were already using Admin SDK correctly

## Testing Checklist
- [x] Recurring tasks API no longer shows permission errors
- [x] FCM token API uses Admin SDK
- [x] Notification send API uses Admin SDK
- [ ] User visits /notifications page and enables notifications
- [ ] FCM token appears in Firestore `fcmTokens` collection
- [ ] Push notifications work when task is assigned

## Notes
- FCM tokens are device/browser specific
- Users must enable notifications on each device
- Tokens can expire and need to be refreshed
- Service worker handles notification display
