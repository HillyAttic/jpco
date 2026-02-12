# Vercel Environment Setup - Firebase Credentials

## Local Setup ✅ Complete
Your `.env.local` file has been created with Firebase Admin credentials.

## Vercel Deployment Setup

### Option 1: Using Vercel CLI (Recommended)

```bash
# Add the environment variable to Vercel
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY production

# When prompted, paste the JSON from your .env.local file
# (Get it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key)

# Then redeploy
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add new variable:
   - Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Value: (paste the JSON from your .env.local file or generate from Firebase Console)
   - Environment: Production (and Preview if needed)
5. Click Save
6. Redeploy your application

### Option 3: Using the Batch Script

Run the included script:
```bash
push-env-to-vercel.bat
```

## Next Steps

1. Restart your local dev server to pick up the new credentials:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. Test locally - the 500 error should be gone

3. Push to Vercel using one of the options above

4. Verify on production - notifications should work

## Verification

After setup, you should see:
- ✅ No more 500 errors in console
- ✅ Notifications API returns data (or empty array)
- ✅ No "Firebase Admin not configured" warnings

## Security Notes

- ✅ `.env.local` is in `.gitignore` - credentials won't be committed
- ✅ Never commit service account keys to Git
- ✅ Use Vercel environment variables for production
- ✅ Rotate keys if accidentally exposed
