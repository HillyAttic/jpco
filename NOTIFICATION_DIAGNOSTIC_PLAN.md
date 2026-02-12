# Notification System Diagnostic & Action Plan

**Date:** February 12, 2026  
**Issue:** User reports notifications not working after git push/merge

## Investigation Results

### ✅ Code Status: ALL GOOD
All notification fixes from previous session are present in commit `c03efac`:
- Service workers (v5.1)
- API routes (server-side fetching)
- Client hooks (polling)
- Mobile support (iOS/Android)

### ✅ Local Environment: CONFIGURED
`.env.local` contains `FIREBASE_SERVICE_ACCOUNT_KEY`

### ⚠️ Likely Issue: Production Environment Variables

The code is correct, but notifications may not work in production if Vercel environment variables aren't set.

## Action Plan

### Step 1: Verify Local Functionality

Test locally first to confirm the code works:

```bash
# Start dev server
npm run dev

# Open http://localhost:3000/notifications
# Click "Enable Notifications"
# Check browser console for errors
```

**Expected behavior:**
- Permission prompt appears
- FCM token is generated
- Token is saved to Firestore
- Notifications list loads (may be empty)

### Step 2: Check Production Environment Variables

Go to Vercel Dashboard and verify these variables are set:

**Required for Notifications API:**
```
FIREBASE_SERVICE_ACCOUNT_KEY=<full JSON service account>
```

**OR individual fields:**
```
FIREBASE_PROJECT_ID=jpcopanel
FIREBASE_CLIENT_EMAIL=<service account email>
FIREBASE_PRIVATE_KEY=<private key>
```

**Required for FCM Client:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jpcopanel.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=jpcopanel
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jpcopanel.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=492450530050
NEXT_PUBLIC_FIREBASE_APP_ID=1:492450530050:web:174cf5cec2a9bdaeb8381b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-GNT1N7174R
NEXT_PUBLIC_FIREBASE_VAPID_KEY=<your VAPID key>
```

### Step 3: Push Environment Variables to Vercel

**Option A: Use the batch script**
```bash
push-env-to-vercel.bat
```

**Option B: Manual via Vercel CLI**
```bash
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY production
# Paste the JSON from .env.local when prompted

vercel env add NEXT_PUBLIC_FIREBASE_VAPID_KEY production
# Paste your VAPID key
```

**Option C: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select project → Settings → Environment Variables
3. Add each variable
4. Select "Production" environment
5. Click Save

### Step 4: Redeploy

After adding environment variables:

```bash
# Trigger a new deployment
vercel --prod

# OR push to main branch
git push origin main
```

### Step 5: Test Production

1. Open your production URL
2. Go to `/notifications`
3. Click "Enable Notifications"
4. Check browser DevTools console for errors
5. Verify notifications list loads

## Common Issues & Solutions

### Issue: "Firebase Admin not configured"
**Solution:** Add `FIREBASE_SERVICE_ACCOUNT_KEY` to Vercel environment variables

### Issue: "Failed to get FCM token"
**Solution:** 
- Verify `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is set
- Check service worker is registered (`firebase-messaging-sw.js`)
- Ensure HTTPS (required for FCM)

### Issue: "Notifications list is empty"
**Solution:** 
- This is normal if no notifications have been sent yet
- Test by creating a notification in Firestore manually
- Or trigger a task assignment/update

### Issue: "Service worker not found"
**Solution:**
- Verify `public/firebase-messaging-sw.js` exists
- Check it's accessible at `/firebase-messaging-sw.js`
- Clear browser cache and reload

### Issue: iOS notifications not working
**Solution:**
- iOS requires app to be added to home screen (PWA)
- iOS 16.4+ required for push notifications
- Check the guidance card on notifications page

## Quick Test Commands

```bash
# Check if service worker files exist
ls public/*.js

# Check if API route exists
ls src/app/api/notifications/route.ts

# Check local environment
cat .env.local | grep FIREBASE

# Test API locally
curl http://localhost:3000/api/notifications?userId=test123

# Check Vercel environment variables
vercel env ls
```

## Verification Checklist

- [ ] Local dev server runs without errors
- [ ] `/notifications` page loads
- [ ] "Enable Notifications" button works
- [ ] Browser console shows no errors
- [ ] Service worker registers successfully
- [ ] FCM token is generated and saved
- [ ] Vercel environment variables are set
- [ ] Production deployment successful
- [ ] Production `/notifications` page works
- [ ] Production notifications can be enabled

## Files to Review

If issues persist, check these files:

1. `public/firebase-messaging-sw.js` - Service worker
2. `src/app/api/notifications/route.ts` - API endpoint
3. `src/hooks/use-notifications.ts` - Client hook
4. `src/app/notifications/page.tsx` - UI page
5. `src/lib/firebase-admin.ts` - Admin SDK setup
6. `.env.local` - Local environment
7. Vercel Dashboard → Environment Variables

## Support Documentation

- `NOTIFICATION_SYSTEM_STATUS.md` - Current system status
- `NOTIFICATIONS_INDEX.md` - Complete overview
- `PUSH_NOTIFICATIONS_TESTING_GUIDE.md` - Testing guide
- `VERCEL_ENV_SETUP.md` - Environment setup guide
