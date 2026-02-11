# 🧪 Quick Test Guide - Mobile Push Notifications

## ✅ Implementation Complete!

All fixes have been applied. Here's how to test:

---

## 🖥️ Desktop Test (5 minutes)

### Step 1: Clear Service Workers
1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Click "Unregister" on all service workers
4. Close DevTools

### Step 2: Test Registration
1. Refresh the page (Ctrl+R or Cmd+R)
2. Open DevTools → Console
3. Go to `/notifications` page
4. Click "Enable Notifications"
5. Accept the permission prompt

### Step 3: Verify
Open DevTools Console and run:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('✅ Service Workers:', regs.length);
  regs.forEach(reg => console.log('URL:', reg.active?.scriptURL));
});
```

**Expected**: Should show ONLY `firebase-messaging-sw.js`

### Step 4: Test Notification
1. Go to Firebase Console
2. Firestore Database → `notifications` collection
3. Add a document with your FCM token
4. Notification should appear!

---

## 📱 Android Test (10 minutes)

### Step 1: Clear Data
1. Open Chrome on Android
2. Go to Settings → Site Settings → All Sites
3. Find your app (localhost:3000 or your domain)
4. Tap "Clear & Reset"

### Step 2: Enable Notifications
1. Open your app
2. Go to `/notifications`
3. Tap "Enable Notifications"
4. Accept permission prompt
5. Should see "Notifications enabled successfully!"

### Step 3: Test Background Notification
1. Close the browser completely (swipe away from recent apps)
2. Send test notification via Firebase Console
3. Notification should appear in system tray
4. Tap notification → App should open

---

## 🍎 iOS Test (15 minutes)

### Step 1: Check iOS Version
- Settings → General → About → Software Version
- Must be iOS 16.4 or later

### Step 2: Add to Home Screen
1. Open Safari
2. Go to your app
3. Tap Share button (square with arrow)
4. Scroll down → "Add to Home Screen"
5. Tap "Add"

### Step 3: Open as PWA
1. Go to home screen
2. Tap your app icon (NOT Safari)
3. App should open in standalone mode (no Safari UI)

### Step 4: Enable Notifications
1. Go to `/notifications`
2. Blue info card should NOT appear (if it does, you're not in PWA mode)
3. Tap "Enable Notifications"
4. Accept permission prompt
5. Should see "Notifications enabled successfully!"

### Step 5: Test Background Notification
1. Close the app (swipe up from bottom)
2. Send test notification via Firebase Console
3. Notification should appear in notification center
4. Tap notification → App should open

---

## 🔍 Quick Debug Commands

### Check Everything:
```javascript
// Paste in browser console
console.log('=== NOTIFICATION DEBUG ===');
console.log('Permission:', Notification.permission);
console.log('SW Support:', 'serviceWorker' in navigator);
console.log('Push Support:', 'PushManager' in window);
console.log('Is Mobile:', /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
console.log('Is iOS:', /iPhone|iPad|iPod/i.test(navigator.userAgent));
console.log('Is PWA:', window.matchMedia('(display-mode: standalone)').matches);

navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(reg => {
    console.log('  - URL:', reg.active?.scriptURL);
    console.log('  - Scope:', reg.scope);
  });
});
```

### Test Manual Notification:
```javascript
// After granting permission
new Notification('Test', {
  body: 'If you see this, browser notifications work!',
  icon: '/images/logo/logo-icon.svg'
});
```

---

## 🎯 Expected Behavior

### Desktop:
✅ One service worker: `firebase-messaging-sw.js`
✅ Permission prompt appears
✅ Notifications work in foreground and background

### Android:
✅ One service worker: `firebase-messaging-sw.js`
✅ Permission prompt appears
✅ Notifications appear in system tray
✅ Clicking notification opens app

### iOS (Browser Mode):
❌ Blue info card appears
❌ "Add to Home Screen" message shown
❌ Cannot enable notifications

### iOS (PWA Mode):
✅ No info card (or yellow mobile card only)
✅ Permission prompt appears
✅ Notifications appear in notification center
✅ Clicking notification opens app

---

## 🚨 Common Issues

### "Service worker issue detected"
→ Clear all service workers and refresh

### "On iOS, please add this app to your home screen first"
→ Follow iOS test steps above

### "Push notifications require iOS 16.4 or later"
→ Update iOS

### No notification appears
→ Check Cloud Function logs: `firebase functions:log --only sendPushNotification`

---

## ✅ Success Checklist

- [ ] Desktop: Notifications enabled successfully
- [ ] Desktop: Only one service worker registered
- [ ] Desktop: Test notification received
- [ ] Android: Notifications enabled successfully
- [ ] Android: Background notification received
- [ ] Android: Clicking notification opens app
- [ ] iOS: Added to home screen
- [ ] iOS: Opened from home screen (PWA mode)
- [ ] iOS: Notifications enabled successfully
- [ ] iOS: Background notification received
- [ ] iOS: Clicking notification opens app

---

## 📞 Need Help?

Check the logs:
1. Browser console for client-side errors
2. Firebase Console → Functions → Logs for server-side errors
3. Firestore → `notifications` collection to verify documents are created
4. Firestore → `fcmTokens` collection to verify tokens are saved

---

**Ready to test!** Start with desktop, then move to mobile devices.
