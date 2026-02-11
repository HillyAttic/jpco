# 📱 Android PWA Lock Screen & Heads-Up Notifications - Complete Fix Guide

## 🎯 WHAT WAS FIXED (Code Changes)

### The ROOT CAUSE: FCM Message Type
The notifications were NOT showing on lock screen / as heads-up popups because of **how FCM messages were structured**.

#### ❌ BEFORE (Broken):
The Cloud Function was sending **notification+data messages**:
```typescript
const message = {
  notification: { title, body },  // ← This causes FCM to AUTO-display a basic notification
  data: { ... },
  webpush: { notification: { ... } }  // ← This gets IGNORED!
};
```

**Why this breaks:** When FCM sees a `notification` payload, it **automatically** displays a basic, low-priority notification — **completely bypassing** your service worker's custom `onBackgroundMessage` handler. Your `requireInteraction`, `vibrate`, `renotify` settings were never being used!

#### ✅ AFTER (Fixed):
Now sending **data-only messages** for web push:
```typescript
const message = {
  // NO top-level 'notification' - intentional!
  data: { title, body, icon, url, ... },  // ← Everything as data
  webpush: { 
    headers: { 
      Urgency: "high",  // ← Wakes device immediately
      TTL: "86400",      // ← Don't drop the message
    }
  },
  android: { 
    priority: "high",
    notification: { ... }  // ← Native Android still gets proper notification
  },
};
```

**Why this works:** With data-only messages, the service worker's `push` event handler gets **full control**. It can use `showNotification()` with:
- `requireInteraction: true` → Notification persists on screen
- `vibrate: [300, 100, 300, 100, 300]` → Strong vibration
- `renotify: true` → Re-alerts even for same tag
- `Urgency: high` header → Google's push service wakes the device immediately

### Files Changed:
1. **`functions/src/index.ts`** - Switched to data-only FCM messages + added Urgency headers
2. **`public/firebase-messaging-sw.js`** - Updated to read from `payload.data` instead of `payload.notification`
3. **`src/lib/firebase-messaging.ts`** - Updated foreground handler for data-only messages

---

## 📋 AFTER DEPLOYMENT: Android Settings (One-Time Setup)

Even with the code fix, Android still requires **one-time manual settings** for PWAs to show lock screen popups. This is a browser/OS limitation, not a code issue.

### Step 1: Clear Old Service Worker & Refresh

On your Android phone:
1. Open Chrome
2. Go to `chrome://serviceworker-internals`
3. Find the entry for `jpcopanel.vercel.app`
4. Tap **Unregister** 
5. Close Chrome completely (swipe it away from recent apps)
6. Reopen Chrome and go to `https://jpcopanel.vercel.app/test-notifications`
7. The new service worker (v2.0) will install automatically

**Alternative:** Clear Chrome's cache:
1. Android Settings → Apps → Chrome → Storage → Clear Cache
2. Reopen Chrome and visit the app

### Step 2: Send a Test Notification

1. Go to `https://jpcopanel.vercel.app/test-notifications`
2. Log in if needed
3. Click **"1. Enable Notifications"** → Allow
4. Click **"5. Test Background (Close Tab)"**
5. Wait 5 seconds, then **lock your phone** or **close the Chrome tab**

### Step 3: Configure Chrome Notification Settings

#### Method A: Via Notification (Easiest)
1. Pull down notification tray
2. **Long-press** (hold 2-3 seconds) on the test notification  
3. Tap **"Settings" ⚙️** or **"Info" ℹ️**
4. You'll see the notification channel settings

#### Method B: Via Android Settings
1. Settings → **Apps** → **Chrome** → **Notifications**
2. Find the notification category (may be called "Sites", "Miscellaneous", or "high_importance_channel")
3. Tap on it

### Step 4: Set These Settings

| Setting | Change to |
|---------|-----------|
| **Importance** | **Urgent** (Make sound and pop on screen) |
| **Pop on screen** | ✅ **ON** |
| **Lock screen** | ✅ **ON** |
| **Sound** | ✅ **ON** |
| **Vibration** | ✅ **ON** |

### Step 5: Additional Android Settings to Check

1. **Lock Screen Notifications:**
   - Settings → Lock screen → Notifications → **Show all notification content**

2. **Do Not Disturb:**
   - Settings → Sound → Do Not Disturb → **OFF** (or add Chrome to exceptions)

3. **Battery Optimization (CRITICAL!):**
   - Settings → Battery → Battery optimization
   - Find **Chrome** → Set to **"Don't optimize"**
   - This prevents Android from killing Chrome in the background

4. **App Background Activity:**
   - Settings → Apps → Chrome → Battery → Allow background activity → **ON**

### Step 6: Test It!

1. Lock your phone
2. From another device (or ask someone to create a task), trigger a notification
3. Your phone should:
   - 📱 **Light up the screen**
   - 🔔 **Show a notification popup on lock screen** (like WhatsApp)
   - 📳 **Vibrate strongly**
   - 🔊 **Play notification sound**

---

## 🚨 TROUBLESHOOTING

### "I still don't see popups after all these steps"

1. **Verify the new service worker is installed:**
   - Open Chrome DevTools (desktop) → Application → Service Workers
   - Check the SW version shows "v2.0" in the logs
   - On mobile: check `chrome://serviceworker-internals`

2. **Verify data-only messages are being received:**
   - Send a test notification
   - Check the notification tray — if you see a notification, the code is working
   - The issue is purely Android settings

3. **Some Android ROMs (Xiaomi, Oppo, Vivo, etc.) have aggressive battery management:**
   - These manufacturers add extra layers of battery optimization
   - Go to their specific battery/power saving settings and whitelist Chrome
   - Look for "Autostart" permission and enable it for Chrome

4. **If installed as PWA (Add to Home Screen):**
   - The PWA may have its own notification settings separate from Chrome
   - Settings → Apps → Find "JPCO" → Notifications → Set all to Urgent/High

---

## ✅ SUCCESS CHECKLIST

- [ ] Firebase Functions deployed successfully
- [ ] New service worker v2.0 is active (old one unregistered)
- [ ] Test notification appears in notification tray
- [ ] Notification Importance set to "Urgent"
- [ ] "Pop on screen" enabled
- [ ] "Lock screen" enabled
- [ ] Sound and Vibration enabled
- [ ] Battery optimization disabled for Chrome
- [ ] Lock screen notification popup works! 🎉

---

## 📝 Technical Summary

| Component | Before | After |
|-----------|--------|-------|
| FCM Message Type | notification+data | **data-only** |
| Web Push Urgency | Not set | **high** |
| Web Push TTL | Not set | **86400** (24h) |
| SW requireInteraction | false | **true** |
| SW vibrate | [200, 100, 200] | **[300, 100, 300, 100, 300]** |
| SW renotify | missing | **true** |
| APNS priority | Not set | **10** (immediate) |
| Foreground notification | requireInteraction: false | **requireInteraction: true** |
