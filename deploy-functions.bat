@echo off
echo ========================================
echo Firebase Cloud Functions Deployment
echo ========================================
echo.

echo Step 1: Checking Firebase CLI...
firebase --version
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not found!
    echo Please run: npm install -g firebase-tools
    pause
    exit /b 1
)
echo ✓ Firebase CLI installed
echo.

echo Step 2: Logging in to Firebase...
echo (Browser will open - please login)
firebase login
if %errorlevel% neq 0 (
    echo ERROR: Login failed!
    pause
    exit /b 1
)
echo ✓ Logged in successfully
echo.

echo Step 3: Initializing Firebase Functions...
echo.
echo IMPORTANT: When prompted, answer:
echo - Features: Select "Functions"
echo - Project: Select "jpcopanel"
echo - Language: Select "JavaScript"
echo - ESLint: Type "N" (No)
echo - Install dependencies: Type "Y" (Yes)
echo.
pause
firebase init functions
if %errorlevel% neq 0 (
    echo ERROR: Initialization failed!
    pause
    exit /b 1
)
echo ✓ Functions initialized
echo.

echo Step 4: Copying Cloud Function code...
if exist firebase-functions-example.js (
    copy /Y firebase-functions-example.js functions\index.js
    echo ✓ Code copied to functions\index.js
) else (
    echo ERROR: firebase-functions-example.js not found!
    pause
    exit /b 1
)
echo.

echo Step 5: Installing dependencies...
cd functions
call npm install firebase-admin firebase-functions
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✓ Dependencies installed
echo.

echo Step 6: Deploying Cloud Functions...
firebase deploy --only functions
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✓ DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your Cloud Functions are now deployed!
echo.
echo Next steps:
echo 1. Test background notifications
echo 2. Check Firebase Console for function status
echo 3. View logs: firebase functions:log
echo.
echo See DEPLOY_CLOUD_FUNCTIONS.md for testing instructions.
echo.
pause
