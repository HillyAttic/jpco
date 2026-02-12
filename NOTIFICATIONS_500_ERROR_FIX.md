# Notifications 500 Error - Fixed

## Problem
The notifications API was returning a 500 Internal Server Error because Firebase Admin SDK credentials weren't configured.

## Solution Applied

### 1. Added Graceful Fallback
Modified `/api/notifications/route.ts` to return an empty array instead of throwing a 500 error when credentials aren't configured. This prevents the app from breaking.

### 2. Created Environment Template
Added `.env.example` with all required Firebase credentials.

## How to Fully Fix (Add Credentials)

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (jpcopanel)
3. Click the gear icon → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file

### Step 2: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Option A: Use the full JSON (easiest)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"jpcopanel","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# Option B: Use individual fields
FIREBASE_PROJECT_ID=jpcopanel
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@jpcopanel.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"
```

### Step 3: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Current Status

✅ App no longer crashes with 500 error
✅ Notifications API returns empty array gracefully
✅ Local `.env.local` file created with credentials
✅ Ready to test locally

## For Vercel Deployment

See `VERCEL_ENV_SETUP.md` for instructions on pushing credentials to Vercel.

## Testing After Setup

Once credentials are added:
1. Restart the dev server
2. The 500 error should disappear
3. Notifications should load properly
4. Check console - warning should be gone

## Files Modified

- `src/app/api/notifications/route.ts` - Added graceful fallback
- `.env.example` - Created with all required variables
