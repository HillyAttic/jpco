@echo off
echo Pushing Firebase credentials to Vercel...
echo.

REM Set the environment variable for Vercel
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY production

echo.
echo Done! The credential has been added to Vercel.
echo You may need to redeploy your app for changes to take effect.
echo.
echo Run: vercel --prod
pause
