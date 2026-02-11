# 🔒 Android Lock Screen & Heads-Up Notification Fix

## 🎯 THE REAL ISSUE

You're getting notifications in the notification tray, but they're NOT showing as:
- ❌ Popup on lock screen (like WhatsApp, Gmail)
- ❌ Heads-up notification (banner at top when phone unlocked)
- ❌ Native app experience

**This is an Android notification priority/importance issue!**

---

## 🔍 WHY THIS HAPPENS

### Android Notification Channels & Importance Levels:

Android has different notification importance levels:

| Level | Behavior |
|-------|----------|
| **MIN** | No sound, no visual interruption, shows only in tray |
| **LOW** | No sound, no visual interruption, shows only in tray |
| **DEFAULT** | Sound, shows in tray, NO heads-up, NO lock screen popup |
| **HIGH** | Sound, shows in tray, heads-up banner, lock screen popup ✅ |
| **MAX** | Same as HIGH but can bypass Do Not Disturb |

**Your notifications are currently at DEFAULT or LOW priority!**

### What You Need:

For lock screen popups and heads-up notifications, you need:
1. ✅ **HIGH or MAX priority**
2. ✅ **Notification channel with HIGH importance**
3. ✅ **Proper Android-specific FCM options**

---

## ✅ THE FIX

### Fix 1: Update Cloud Function with HIGH Priority ✅

The FCM message needs Android-specific priority settings:

```typescript
// functions/src/index.ts
const message = {
  notification: {
    title: notification.title || "New Notification",
    body: notification.body || "You have a new notification",
  },
  data: {
    ...(notification.data || {}),
    notificationId: notificationId,
  },
  token: notification.fcmToken,
  
  // Web/PWA settings
  webpush: {
    fcmOptions: {
      link: notification.data?.url || "/notifications",
    },
    notification: {
      icon: "/images/logo/logo-icon.svg",
      badge: "/images/logo/logo-icon.svg",
      requireInteraction: false,
      vibrate: [200, 100, 200],
      tag: "jpco-notification",
    },
  },
  
  // ✅ CRITICAL: Android-specific settings for lock screen & heads-up
  android: {
    priority: "high",  // ✅ HIGH PRIORITY
    notification: {
      icon: "logo_icon",
      color: "#5750F1",
      sound: "default",
      channelId: "high_importance_channel",  // ✅ HIGH IMPORTANCE CHANNEL
      priority: "high",  // ✅ NOTIFICATION PRIORITY
      defaultSound: true,
      defaultVibrateTimings: true,
      defaultLightSettings: true,
      visibility: "public",  // ✅ SHOW ON LOCK SCREEN
      notificationPriority: "PRIORITY_HIGH",  // ✅ HEADS-UP NOTIFICATION
    },
  },
  
  // iOS settings
  apns: {
    payload: {
      aps: {
        sound: "default",
        badge: 1,
        alert: {
          title: notification.title || "New Notification",
          body: notification.body || "You have a new notification",
        },
      },
    },
  },
};
```

**Key Android settings:**
- `priority: "high"` - Message priority
- `notification.priority: "high"` - Notification priority
- `notification.notificationPriority: "PRIORITY_HIGH"` - Heads-up notification
- `notification.visibility: "public"` - Show on lock screen
- `notification.channelId: "high_importance_channel"` - Use high importance channel

---

### Fix 2: Update Service Worker with HIGH Priority ✅

The service worker also needs to request high priority:

```javascript
// public/firebase-messaging-sw.js
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (!event.data) return;
  
  const payload = event.data.json();
  const notificationData = payload.notification || {};
  const data = payload.data || {};
  
  const notificationTitle = notificationData.title || 'New Notification';
  const notificationOptions = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/images/logo/logo-icon.svg',
    badge: '/images/logo/logo-icon.svg',
    tag: data.notificationId || 'jpco-notification',
    data: {
      url: data.url || '/notifications',
      taskId: data.taskId,
      type: data.type,
      notificationId: data.notificationId,
    },
    
    // ✅ CRITICAL: Settings for lock screen & heads-up
    requireInteraction: true,  // ✅ Keep notification visible
    vibrate: [200, 100, 200, 100, 200],  // ✅ Strong vibration pattern
    silent: false,  // ✅ Play sound
    timestamp: Date.now(),
    renotify: true,  // ✅ Alert even if notification exists
    
    // ✅ Actions make it more prominent
    actions: [
      { action: 'open', title: 'View', icon: '/images/logo/logo-icon.svg' },
      { action: 'close', title: 'Dismiss' }
    ],
    
    // ✅ Image makes it more prominent (optional)
    // image: '/images/notification-image.png',
  };
  
  console.log('[firebase-messaging-sw.js] Showing HIGH PRIORITY notification:', notificationTitle);
  
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[firebase-messaging-sw.js] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[firebase-messaging-sw.js] Error showing notification:', error);
      })
  );
});
```

**Key settings:**
- `requireInteraction: true` - Keeps notification visible until user interacts
- `vibrate: [200, 100, 200, 100, 200]` - Stronger vibration pattern
- `silent: false` - Ensures sound plays
- `renotify: true` - Alerts even if similar notification exists
- `actions: [...]` - Action buttons make it more prominent

---

## 🚨 ANDROID SYSTEM SETTINGS

Even with correct code, Android system settings can block lock screen notifications:

### Check These Settings on Your Phone:

#### 1. App Notification Settings:
```
Settings → Apps → Chrome (or your PWA) → Notifications
- Ensure "Show notifications" is ON
- Tap on notification category
- Set importance to "High" or "Urgent"
- Enable "Pop on screen"
- Enable "Lock screen" notifications
```

#### 2. Lock Screen Settings:
```
Settings → Lock screen → Notifications
- Enable "Show notifications"
- Set to "Show all notification content"
```

#### 3. Do Not Disturb:
```
Settings → Sound → Do Not Disturb
- Ensure it's OFF or
- Add Chrome/PWA to exceptions
```

#### 4. Battery Optimization:
```
Settings → Battery → Battery optimization
- Find Chrome or your PWA
- Set to "Don't optimize"
```

#### 5. Notification Channel (After First Notification):
```
After receiving first notification:
1. Long-press the notification
2. Tap "Settings" or info icon
3. Find the notification channel
4. Set importance to "High" or "Urgent"
5. Enable "Pop on screen"
6. Enable "Lock screen"
```

---

## 🔧 IMPLEMENTATION

Let me update the files now:

### File 1: Cloud Function

Update `functions/src/index.ts` with high priority Android settings.

### File 2: Service Worker

Update `public/firebase-messaging-sw.js` with requireInteraction and stronger settings.

---

## 📱 ANDROID NOTIFICATION BEHAVIOR

### With DEFAULT Priority (Current):
```
Phone Unlocked: ❌ No heads-up banner
Phone Locked: ❌ No popup on lock screen
Notification Tray: ✅ Shows in tray (when pulled down)
Sound: ⚠️ Quiet or no sound
Vibration: ⚠️ Weak or no vibration
```

### With HIGH Priority (After Fix):
```
Phone Unlocked: ✅ Heads-up banner at top of screen
Phone Locked: ✅ Popup on lock screen
Notification Tray: ✅ Shows in tray
Sound: ✅ Plays notification sound
Vibration: ✅ Strong vibration
Experience: ✅ Like WhatsApp, Gmail, etc.
```

---

## 🧪 TESTING AFTER FIX

### Test 1: Lock Screen Popup
1. Lock your phone
2. Send test notification
3. **Expected**: Phone screen lights up, notification popup appears on lock screen

### Test 2: Heads-Up Notification
1. Unlock phone, use another app
2. Send test notification
3. **Expected**: Banner appears at top of screen (heads-up notification)

### Test 3: Sound & Vibration
1. Ensure phone is not on silent
2. Send test notification
3. **Expected**: Hear notification sound, feel vibration

---

## 🎯 WHY PWAs ARE DIFFERENT FROM NATIVE APPS

### Native Apps (WhatsApp, Gmail):
- Can set notification channel importance programmatically
- Can request high priority by default
- Have more control over notification behavior
- Can use FCM with full Android API access

### PWAs (Your App):
- Limited by browser (Chrome) notification API
- Cannot programmatically set channel importance
- Rely on FCM Android settings in message payload
- User must manually set channel importance (first time)

### The Workaround:
1. ✅ Send HIGH priority in FCM message (server-side)
2. ✅ Use `requireInteraction: true` (client-side)
3. ✅ User sets channel importance to HIGH (one-time, manual)
4. ✅ After that, notifications behave like native apps

---

## 📊 COMPARISON

### Before Fix:
```json
{
  "android": {
    "notification": {
      "icon": "logo_icon",
      "color": "#5750F1",
      "sound": "default"
      // ❌ No priority settings
      // ❌ No visibility settings
      // ❌ No channel settings
    }
  }
}
```

### After Fix:
```json
{
  "android": {
    "priority": "high",  // ✅ Message priority
    "notification": {
      "icon": "logo_icon",
      "color": "#5750F1",
      "sound": "default",
      "channelId": "high_importance_channel",  // ✅ High importance channel
      "priority": "high",  // ✅ Notification priority
      "defaultSound": true,
      "defaultVibrateTimings": true,
      "visibility": "public",  // ✅ Lock screen
      "notificationPriority": "PRIORITY_HIGH"  // ✅ Heads-up
    }
  }
}
```

---

## ✅ IMPLEMENTATION STEPS

1. Update Cloud Function with Android high priority settings
2. Update Service Worker with requireInteraction
3. Deploy changes
4. Clear app cache on phone
5. Send test notification
6. Long-press notification → Settings → Set importance to HIGH
7. Test again - should show on lock screen!

---

## 🚀 EXPECTED RESULT

After implementing these fixes and setting channel importance to HIGH:

✅ Notifications will popup on lock screen
✅ Notifications will show as heads-up banners
✅ Sound will play (if not on silent)
✅ Strong vibration
✅ Native app experience

---

**Let me implement these fixes now!**
