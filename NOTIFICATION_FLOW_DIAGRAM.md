# Notification System - Flow Diagram

## Complete Notification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TASK ASSIGNMENT FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. Admin Creates Task
   │
   ├─> POST /api/tasks
   │   ├─> Validate request (Admin SDK verifies token)
   │   ├─> Create task in Firestore
   │   └─> Get assignedTo user IDs
   │
   ├─> POST /api/notifications/send
   │   ├─> For each user ID:
   │   │   ├─> Get FCM token from fcmTokens collection
   │   │   ├─> Send FCM push (Admin SDK)
   │   │   │   └─> Data-only message (no notification payload)
   │   │   └─> Store in notifications collection
   │   │
   │   └─> Return results { sent: [...], errors: [...] }
   │
   └─> Response: Task created successfully

2. FCM Delivers Push to User's Device
   │
   ├─> Push arrives at browser/device
   │   └─> Service Worker receives push event
   │
   └─> Service Worker (firebase-messaging-sw.js v5.2)
       ├─> Parse push payload
       ├─> Extract title, body, data
       ├─> Check for duplicate (tag-based)
       │   ├─> If duplicate: Skip (log warning)
       │   └─> If new: Continue
       │
       └─> Display notification
           ├─> Title: "New Task Assigned"
           ├─> Body: "You have been assigned a new task: [title]"
           ├─> Icon: /images/logo/logo-icon.svg
           ├─> Actions: [View, Dismiss]
           └─> requireInteraction: true

3. User Interaction
   │
   ├─> User clicks notification
   │   ├─> Close notification
   │   ├─> Focus/open app window
   │   └─> Navigate to /tasks
   │
   └─> User dismisses notification
       └─> Close notification
```

## Foreground vs Background Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APP OPEN (FOREGROUND)                             │
└─────────────────────────────────────────────────────────────────────┘

Push Arrives
   │
   ├─> Service Worker receives push
   │   ├─> Displays notification (as above)
   │   └─> Logs: [SW v5.2] PUSH EVENT
   │
   └─> Firebase Messaging SDK fires onMessage
       ├─> onForegroundMessage callback
       │   ├─> Logs: [Foreground] Message received
       │   ├─> Refreshes notification list
       │   └─> NO duplicate notification shown
       │
       └─> User sees ONE notification from Service Worker

┌─────────────────────────────────────────────────────────────────────┐
│                    APP CLOSED (BACKGROUND)                           │
└─────────────────────────────────────────────────────────────────────┘

Push Arrives
   │
   └─> Service Worker receives push
       ├─> Displays notification (as above)
       ├─> Logs: [SW v5.2] PUSH EVENT
       └─> Notification appears on lock screen/desktop
```

## Deduplication Logic

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DUPLICATE PREVENTION                              │
└─────────────────────────────────────────────────────────────────────┘

Service Worker maintains Set of shown notification IDs:
   shownNotifications = Set()

When push arrives:
   1. Extract notification tag (ID)
   2. Check if tag in shownNotifications
      ├─> If YES: Skip (log warning)
      └─> If NO: Continue
   3. Add tag to shownNotifications
   4. Display notification

Cleanup:
   - Every 5 minutes: shownNotifications.clear()
   - Prevents memory buildup
   - Allows re-showing same notification after 5 min
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                                   │
└─────────────────────────────────────────────────────────────────────┘

Scenario 1: No FCM Token
   POST /api/notifications/send
   │
   ├─> Get FCM token from Firestore
   │   └─> Token not found
   │
   ├─> Log: [Notification Send] ❌ No FCM token found
   ├─> Store notification in Firestore (sent: false)
   └─> Return error: { userId, error: 'No FCM token' }

Scenario 2: Invalid/Expired Token
   POST /api/notifications/send
   │
   ├─> Get FCM token from Firestore
   │   └─> Token found
   │
   ├─> Send FCM push
   │   └─> Error: messaging/invalid-registration-token
   │
   ├─> Log: [Notification Send] ❌ FCM failed
   ├─> Delete expired token from Firestore
   ├─> Log: [Notification Send] 🗑️ Cleaned up expired token
   └─> Return error: { userId, error: 'Invalid token' }

Scenario 3: Admin SDK Not Configured
   POST /api/notifications/send
   │
   ├─> Try to send FCM push
   │   └─> Error: Admin SDK not initialized
   │
   ├─> Log: [Notification Send] Error sending notifications
   └─> Return 500: { error: 'Failed to send notifications' }
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA STRUCTURES                                   │
└─────────────────────────────────────────────────────────────────────┘

Firestore Collections:

fcmTokens/
  └─ {userId}/
      ├─ token: string (FCM registration token)
      └─ updatedAt: timestamp

notifications/
  └─ {notificationId}/
      ├─ userId: string
      ├─ title: string
      ├─ body: string
      ├─ read: boolean
      ├─ sent: boolean
      ├─ sentAt: timestamp
      ├─ sentDirect: boolean (true if sent via Admin SDK)
      ├─ createdAt: timestamp
      └─ data: {
          ├─ taskId: string
          ├─ url: string
          └─ type: string
        }

tasks/
  └─ {taskId}/
      ├─ title: string
      ├─ description: string
      ├─ assignedTo: string[] (user IDs)
      ├─ createdBy: string (user ID)
      └─ ...

FCM Message Format (Data-only):
{
  data: {
    title: string,
    body: string,
    icon: string,
    badge: string,
    url: string,
    type: string,
    taskId: string,
    timestamp: string
  },
  token: string,
  webpush: {
    headers: {
      Urgency: 'high',
      TTL: '86400'
    },
    fcmOptions: {
      link: string
    }
  }
}
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENT ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────┘

Client Side:
   ├─ firebase-messaging.ts
   │   ├─ initializeMessaging() - Get FCM token
   │   ├─ requestNotificationPermission() - Request permission
   │   ├─ onForegroundMessage() - Handle foreground messages
   │   └─ saveFCMToken() - Save token to Firestore
   │
   ├─ firebase-messaging-sw.js (Service Worker)
   │   ├─ push event handler - Display notifications
   │   ├─ notificationclick handler - Handle clicks
   │   └─ Deduplication logic
   │
   └─ /notifications page
       ├─ Enable/disable notifications
       ├─ Display notification list
       └─ Fix service worker issues

Server Side:
   ├─ /api/notifications/send
   │   ├─ Validate request
   │   ├─ Get FCM tokens
   │   ├─ Send FCM push (Admin SDK)
   │   └─ Store in Firestore
   │
   ├─ /api/notifications
   │   ├─ GET: Fetch user notifications
   │   └─ POST: Mark as read/delete
   │
   ├─ /api/tasks
   │   ├─ POST: Create task
   │   └─ Call /api/notifications/send
   │
   └─ firebase-admin.ts
       ├─ Initialize Admin SDK
       ├─ adminDb - Firestore
       └─ adminMessaging - FCM
```

## Timeline Example

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TYPICAL NOTIFICATION TIMELINE                     │
└─────────────────────────────────────────────────────────────────────┘

T+0ms    Admin clicks "Create Task"
T+50ms   POST /api/tasks received
T+100ms  Task created in Firestore
T+120ms  POST /api/notifications/send called
T+150ms  FCM token retrieved from Firestore
T+200ms  FCM push sent via Admin SDK
T+250ms  Notification stored in Firestore
T+300ms  Response returned to client
         ─────────────────────────────────────
T+500ms  FCM delivers push to user's device
T+520ms  Service worker receives push event
T+540ms  Service worker displays notification
T+550ms  User sees notification

Total time: ~550ms from task creation to notification display
```

## Success Indicators

```
✅ Logs show:
   [Notification Send] ✅ FCM token found
   [Notification Send] ✅ FCM sent to xxx in XXms
   [SW v5.2] 🔔 Title: New Task Assigned

✅ User receives notification within 1-2 seconds

✅ Notification format matches requirements:
   - Title: "New Task Assigned"
   - Body: "You have been assigned a new task: [title]"
   - Icon: JPCO logo
   - Actions: View, Dismiss

✅ No duplicate notifications

✅ No fallback notifications
```

---

**Last Updated**: 2026-02-13
**Version**: 2.0
