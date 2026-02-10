# 🔔 Push Notifications System - Complete Guide

## 📖 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Setup Instructions](#setup-instructions)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)
9. [Documentation](#documentation)

---

## Overview

This is a complete Firebase Cloud Messaging (FCM) push notification system for your Progressive Web App (PWA). It enables real-time notifications when tasks are assigned to users, even when the app is closed or in the background.

### ✅ What's Implemented

- **Service Worker**: Handles background push notifications
- **FCM Integration**: Complete Firebase Cloud Messaging setup
- **Notification Management**: Enable/disable, view history, mark as read
- **Task Integration**: Automatic notifications on task assignment
- **Real-time Updates**: Live notification feed using Firestore
- **Multi-platform Support**: Works on desktop and mobile browsers

### 🎯 Key Benefits

- **Real-time Alerts**: Users get instant notifications
- **Background Support**: Works even when app is closed
- **User Control**: Users can enable/disable notifications
- **Notification History**: All notifications stored and accessible
- **Task Integration**: Seamless integration with task management

---

## Quick Start

### 1. Add VAPID Key (Required - 2 minutes)

```bash
# Get your VAPID key from Firebase Console
# Project Settings → Cloud Messaging → Web Push certificates

# Add to: src/lib/firebase-messaging.ts (line ~30)
vapidKey: 'YOUR_VAPID_KEY_HERE'
```

See: [`GET_VAPID_KEY.md`](GET_VAPID_KEY.md) for detailed instructions.

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Notifications

1. Visit: `http://localhost:3000/notifications`
2. Click "Enable Notifications"
3. Accept browser permission
4. Create a task assigned to yourself
5. See notification appear! 🎉

**✅ That's it! Foreground notifications are working.**

For background notifications (app closed), deploy Cloud Functions (see below).

---

## Features

### ✅ User Features

- **Enable/Disable Notifications**: One-click toggle
- **Notification History**: View all past notifications
- **Mark as Read**: Track which notifications you've seen
- **Click to Navigate**: Jump directly to relevant task
- **Real-time Updates**: Notifications appear instantly
- **Unread Badges**: Visual indicators for new notifications

### ✅ Admin Features

- **Automatic Notifications**: Sent when tasks are assigned
- **Multiple Assignees**: All assigned users get notified
- **Custom Messages**: Task title and details included
- **Delivery Tracking**: Monitor notification status in Firestore

### ✅ Technical Features

- **Service Worker**: Background notification support
- **FCM Integration**: Firebase Cloud Messaging
- **Firestore Storage**: Notification history and tokens
- **Real-time Sync**: Live updates via Firestore listeners
- **Error Handling**: Graceful fallbacks and error messages
- **Security**: User-level access control

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Device                          │
│  ┌──────────────┐         ┌──────────────────────┐    │
│  │ Notifications│         │ Service Worker       │    │
│  │ Page         │◄────────┤ (firebase-messaging) │    │
│  └──────────────┘         └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                    │                    ▲
                    │ FCM Token          │ Push Message
                    ▼                    │
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Routes                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ /api/notifications/fcm-token  (Save/Delete)      │  │
│  │ /api/notifications/send       (Queue)            │  │
│  │ /api/tasks                    (Create + Notify)  │  │
│  │ /api/tasks/[id]               (Update + Notify)  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    │                    ▲
                    │ Store              │ Trigger
                    ▼                    │
┌─────────────────────────────────────────────────────────┐
│                  Firestore Database                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ fcmTokens/{userId}        (FCM Tokens)           │  │
│  │ notifications/{id}        (Notification Data)    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                                         │
                                         │ onCreate Trigger
                                         ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Cloud Functions                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ sendPushNotification  (Send via FCM)             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                                         │
                                         │ Send
                                         ▼
┌─────────────────────────────────────────────────────────┐
│          Firebase Cloud Messaging (FCM)                 │
│  Delivers push notifications to user devices            │
└─────────────────────────────────────────────────────────┘
```

See: [`NOTIFICATION_FLOW_DIAGRAM.md`](NOTIFICATION_FLOW_DIAGRAM.md) for detailed diagrams.

---

## Setup Instructions

### Prerequisites

- Firebase project configured
- Node.js and npm installed
- Firebase CLI (for Cloud Functions)

### Step 1: VAPID Key Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `jpcopanel`
3. Navigate to: **Project Settings** → **Cloud Messaging**
4. Scroll to: **Web Push certificates**
5. Click: **Generate key pair** (if needed)
6. Copy the key

Update `src/lib/firebase-messaging.ts`:
```typescript
const token = await getToken(messaging, {
  vapidKey: 'YOUR_ACTUAL_VAPID_KEY_HERE',
});
```

### Step 2: Firestore Security Rules

Add to `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fcmTokens/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }
  }
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

### Step 3: Cloud Functions (Optional - for background notifications)

Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
```

Initialize Functions:
```bash
firebase init functions
```

Copy code from `firebase-functions-example.js` to `functions/index.js`

Install dependencies:
```bash
cd functions
npm install firebase-admin firebase-functions
cd ..
```

Deploy:
```bash
firebase deploy --only functions
```

### Step 4: Test

```bash
npm run dev
```

Visit: `http://localhost:3000/notifications`

---

## Testing

### Test Scenarios

#### ✅ Scenario 1: Enable Notifications
1. Visit `/notifications`
2. Click "Enable Notifications"
3. Accept browser permission
4. Verify FCM token in console

#### ✅ Scenario 2: Foreground Notification
1. Keep app open
2. Create task assigned to you
3. See toast notification appear

#### ✅ Scenario 3: Background Notification (Requires Cloud Functions)
1. Enable notifications
2. Close browser tab
3. Create task assigned to you (from another device)
4. See system notification

#### ✅ Scenario 4: Notification History
1. Visit `/notifications`
2. See list of all notifications
3. Click notification to mark as read
4. Click notification to navigate to task

### Browser Testing

| Browser | Foreground | Background |
|---------|-----------|-----------|
| Chrome (Desktop) | ✅ | ✅ |
| Chrome (Android) | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Edge | ✅ | ✅ |
| Safari (macOS 13+) | ✅ | ⚠️ |
| Safari (iOS 16.4+) | ⚠️ | ⚠️ |

See: [`NOTIFICATION_TESTING_GUIDE.md`](NOTIFICATION_TESTING_GUIDE.md) for detailed testing instructions.

---

## Deployment

### Production Checklist

- [ ] VAPID key added to code
- [ ] Firestore security rules deployed
- [ ] Cloud Functions deployed (for background notifications)
- [ ] HTTPS enabled on production domain
- [ ] Service worker registered successfully
- [ ] Tested on Chrome (Desktop)
- [ ] Tested on Chrome (Android)
- [ ] Tested on Safari (iOS) - Add to home screen
- [ ] Monitored Cloud Function logs
- [ ] Verified notification delivery

### Environment Variables

No environment variables needed! All configuration is in:
- `src/lib/firebase.ts` (Firebase config)
- `src/lib/firebase-messaging.ts` (VAPID key)
- `public/firebase-messaging-sw.js` (Service worker)

### Build and Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel/Netlify/etc.
# Service worker will be automatically served from /public
```

---

## Troubleshooting

### Common Issues

#### ❌ "No FCM token available"
**Cause:** VAPID key not set or incorrect  
**Fix:** Add correct VAPID key to `src/lib/firebase-messaging.ts`

#### ❌ "Service worker registration failed"
**Cause:** Service worker file not found or incorrect headers  
**Fix:** 
1. Verify `public/firebase-messaging-sw.js` exists
2. Check `next.config.mjs` has service worker headers
3. Restart dev server

#### ❌ "Notification permission denied"
**Cause:** User denied browser permission  
**Fix:** 
1. Reset browser permissions
2. Chrome: Settings → Privacy → Site Settings → Notifications
3. Remove site from blocked list

#### ❌ Background notifications not working
**Cause:** Cloud Functions not deployed  
**Fix:** Deploy Cloud Functions (see Setup Step 3)

#### ❌ CORS errors
**Cause:** Service worker headers not configured  
**Fix:** Verify `next.config.mjs` has correct headers

### Debug Tools

#### Check Service Worker:
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers**
4. Verify `firebase-messaging-sw.js` is registered

#### Check FCM Token:
```javascript
// Run in browser console
console.log('Permission:', Notification.permission);
```

#### Check Firestore Data:
1. Go to Firebase Console
2. Open Firestore Database
3. Check `fcmTokens` and `notifications` collections

---

## Documentation

### Quick Reference

- **Quick Start**: [`QUICK_START_NOTIFICATIONS.md`](QUICK_START_NOTIFICATIONS.md)
- **Complete Setup**: [`FCM_PUSH_NOTIFICATIONS_SETUP.md`](FCM_PUSH_NOTIFICATIONS_SETUP.md)
- **Testing Guide**: [`NOTIFICATION_TESTING_GUIDE.md`](NOTIFICATION_TESTING_GUIDE.md)
- **VAPID Key**: [`GET_VAPID_KEY.md`](GET_VAPID_KEY.md)
- **Flow Diagrams**: [`NOTIFICATION_FLOW_DIAGRAM.md`](NOTIFICATION_FLOW_DIAGRAM.md)
- **Implementation Summary**: [`PUSH_NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md`](PUSH_NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md)

### Code Files

- **Service Worker**: `public/firebase-messaging-sw.js`
- **FCM Library**: `src/lib/firebase-messaging.ts`
- **Notifications Page**: `src/app/notifications/page.tsx`
- **API Endpoints**: 
  - `src/app/api/notifications/fcm-token/route.ts`
  - `src/app/api/notifications/send/route.ts`
- **Task Integration**: 
  - `src/app/api/tasks/route.ts`
  - `src/app/api/tasks/[id]/route.ts`
- **Cloud Functions**: `firebase-functions-example.js`

### API Reference

#### POST `/api/notifications/fcm-token`
Save FCM token for a user
```json
{
  "userId": "USER_ID",
  "token": "FCM_TOKEN"
}
```

#### DELETE `/api/notifications/fcm-token`
Delete FCM token
```json
{
  "userId": "USER_ID"
}
```

#### POST `/api/notifications/send`
Queue notifications
```json
{
  "userIds": ["USER_ID_1", "USER_ID_2"],
  "title": "Notification Title",
  "body": "Notification Body",
  "data": {
    "taskId": "TASK_ID",
    "url": "/tasks",
    "type": "task_assigned"
  }
}
```

---

## FAQ

### Q: Is this possible with PWAs?
**A:** YES! ✅ Firebase Cloud Messaging fully supports PWAs and can deliver push notifications even when the app is closed.

### Q: Do I need Cloud Functions?
**A:** Only for background notifications (app closed). Foreground notifications work without Cloud Functions.

### Q: What about iOS Safari?
**A:** iOS 16.4+ supports push notifications, but the app must be added to the home screen first.

### Q: How do I test without deploying?
**A:** Foreground notifications work immediately after adding VAPID key. Background notifications require Cloud Functions.

### Q: Can I customize notification appearance?
**A:** Yes! Edit `public/firebase-messaging-sw.js` to customize title, body, icon, actions, etc.

### Q: How do I monitor notification delivery?
**A:** Check Cloud Function logs in Firebase Console and Firestore `notifications` collection.

---

## Support

### Getting Help

1. Check documentation files (see above)
2. Review Firebase Console logs
3. Check browser console for errors
4. Verify Firestore security rules
5. Test in incognito mode

### Useful Links

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## License

This notification system is part of the JPCO Dashboard project.

---

## 🎉 Conclusion

**Status:** ✅ Implementation Complete

**What's Working:**
- ✅ Notification permission management
- ✅ FCM token generation and storage
- ✅ Foreground notifications
- ✅ Notification history
- ✅ Task assignment integration
- ✅ Real-time updates

**What's Needed:**
- ⏳ Add VAPID key (5 minutes)
- ⏳ Deploy Cloud Functions (10 minutes) - Optional

**Time to Production:** ~15-30 minutes

---

**Ready to go live?** Follow the Quick Start guide above! 🚀
