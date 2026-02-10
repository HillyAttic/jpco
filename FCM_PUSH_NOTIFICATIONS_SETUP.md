# Firebase Cloud Messaging (FCM) Push Notifications Setup Guide

## Overview

This implementation provides real-time push notifications for your PWA using Firebase Cloud Messaging (FCM). Users will receive notifications when tasks are assigned to them, even when the app is closed or in the background.

## ✅ What's Been Implemented

### 1. Service Worker (`public/firebase-messaging-sw.js`)
- Handles background push notifications
- Shows notification with custom title, body, and icon
- Handles notification clicks to open the app
- Supports notification actions (View/Dismiss)

### 2. Firebase Messaging Library (`src/lib/firebase-messaging.ts`)
- Request notification permissions
- Get FCM tokens
- Handle foreground messages
- Save/delete FCM tokens to Firestore

### 3. Notifications Page (`src/app/notifications/page.tsx`)
- Enable/disable push notifications
- View notification history
- Mark notifications as read
- Real-time notification updates

### 4. API Endpoints

#### `/api/notifications/fcm-token` (POST/DELETE)
- Save user's FCM token to Firestore
- Delete FCM token when user disables notifications

#### `/api/notifications/send` (POST)
- Queue notifications for users
- Store notification data in Firestore

### 5. Task Assignment Integration
- Automatically sends notifications when tasks are created with assignees
- Sends notifications when new users are assigned to existing tasks
- Integrated in `/api/tasks` and `/api/tasks/[id]` endpoints

## 🔧 Setup Instructions

### Step 1: Generate VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `jpcopanel`
3. Go to **Project Settings** > **Cloud Messaging** tab
4. Scroll to **Web Push certificates**
5. Click **Generate key pair** (if not already generated)
6. Copy the VAPID key

### Step 2: Update VAPID Key

Open `src/lib/firebase-messaging.ts` and replace `YOUR_VAPID_KEY_HERE` with your actual VAPID key:

```typescript
const token = await getToken(messaging, {
  vapidKey: 'YOUR_ACTUAL_VAPID_KEY_HERE',
});
```

### Step 3: Update Next.js Config

Add the service worker to your `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other config
  async headers() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Step 4: Register Service Worker

The service worker is automatically registered when users visit the notifications page and enable notifications.

### Step 5: Set Up Firebase Cloud Functions (IMPORTANT!)

**Currently, notifications are only queued in Firestore. To actually send push notifications, you need to set up Firebase Cloud Functions.**

#### Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

#### Create Cloud Function (`functions/index.js`):

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Trigger when a new notification is created
exports.sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    
    // Skip if already sent
    if (notification.sent) {
      return null;
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      token: notification.fcmToken,
    };

    try {
      // Send the notification
      await admin.messaging().send(message);
      
      // Mark as sent
      await snap.ref.update({ sent: true });
      
      console.log('Notification sent successfully');
      return null;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  });
```

#### Deploy Cloud Function:
```bash
firebase deploy --only functions
```

### Step 6: Update Firestore Security Rules

Add these rules to allow users to read their own notifications:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // FCM Tokens
    match /fcmTokens/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if request.auth != null;
    }
  }
}
```

## 📱 How It Works

### 1. User Enables Notifications
1. User visits `/notifications` page
2. Clicks "Enable Notifications" button
3. Browser requests notification permission
4. FCM token is generated and saved to Firestore

### 2. Task Assignment
1. Admin/Manager creates a task and assigns it to users
2. API endpoint `/api/tasks` is called
3. Notification is queued in Firestore for each assigned user
4. Cloud Function detects new notification and sends push notification via FCM
5. User receives notification (even if app is closed)

### 3. Notification Delivery
- **App Open (Foreground)**: Toast notification appears in the app
- **App Closed/Background**: System notification appears
- **Notification Click**: Opens the app to the relevant page

## 🧪 Testing

### Test Notification Permission:
1. Visit `http://localhost:3000/notifications`
2. Click "Enable Notifications"
3. Accept browser permission prompt
4. Check browser console for FCM token

### Test Task Assignment Notification:
1. Create a new task and assign it to a user
2. Check Firestore `notifications` collection for new document
3. If Cloud Function is deployed, user should receive push notification
4. Check notification appears in `/notifications` page

### Test Background Notifications:
1. Enable notifications
2. Close the browser tab or minimize it
3. Create a task assigned to your user (from another device/browser)
4. You should receive a system notification

## 🔍 Troubleshooting

### No FCM Token Generated
- Check browser console for errors
- Ensure VAPID key is correct
- Verify Firebase config is correct
- Try in incognito mode (extensions can block)

### Notifications Not Received
- Verify Cloud Function is deployed
- Check Cloud Function logs in Firebase Console
- Ensure FCM token is saved in Firestore
- Check browser notification settings

### Service Worker Not Registered
- Check `public/firebase-messaging-sw.js` exists
- Verify service worker is registered (check DevTools > Application > Service Workers)
- Clear browser cache and reload

### CORS Errors
- Ensure `next.config.mjs` has correct headers
- Verify service worker is served from root path

## 📊 Firestore Collections

### `fcmTokens/{userId}`
```javascript
{
  token: "FCM_TOKEN_STRING",
  updatedAt: Timestamp
}
```

### `notifications/{notificationId}`
```javascript
{
  userId: "USER_ID",
  fcmToken: "FCM_TOKEN_STRING",
  title: "Notification Title",
  body: "Notification Body",
  data: {
    taskId: "TASK_ID",
    url: "/tasks",
    type: "task_assigned"
  },
  read: false,
  sent: false,
  createdAt: Timestamp
}
```

## 🚀 Production Deployment

1. ✅ Generate and add VAPID key
2. ✅ Deploy Cloud Functions
3. ✅ Update Firestore security rules
4. ✅ Test on production domain
5. ✅ Verify HTTPS is enabled (required for service workers)
6. ✅ Test on mobile devices (iOS Safari, Android Chrome)

## 📝 Notes

- **iOS Safari**: Push notifications on iOS require the app to be added to home screen (PWA)
- **HTTPS Required**: Service workers only work on HTTPS (or localhost)
- **Token Refresh**: FCM tokens can expire; implement token refresh logic
- **Unsubscribe**: Users can disable notifications from the notifications page

## 🎯 Next Steps

1. **Add VAPID key** to `src/lib/firebase-messaging.ts`
2. **Deploy Cloud Functions** to actually send push notifications
3. **Test thoroughly** on different browsers and devices
4. **Monitor** Cloud Function logs for errors
5. **Implement** notification preferences (email, push, etc.)

## ✨ Features

- ✅ Real-time push notifications
- ✅ Background notification support
- ✅ Notification history
- ✅ Mark as read functionality
- ✅ Automatic task assignment notifications
- ✅ Foreground toast notifications
- ✅ Notification click handling
- ✅ Enable/disable notifications

---

**Is this possible?** YES! ✅

Firebase Cloud Messaging fully supports PWAs and can deliver push notifications even when the app is closed or in the background. The implementation is complete and ready to use once you:
1. Add your VAPID key
2. Deploy the Cloud Functions

The system will then automatically send push notifications whenever tasks are assigned to users!
