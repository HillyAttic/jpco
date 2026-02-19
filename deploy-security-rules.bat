@echo off
REM ============================================================================
REM Security Rules Deployment Script
REM Deploys updated Firestore security rules using Firebase CLI
REM ============================================================================

echo.
echo ========================================
echo   FIREBASE SECURITY RULES DEPLOYMENT
echo ========================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Firebase CLI is not installed!
    echo.
    echo Please install it using:
    echo   npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking Firebase CLI version...
firebase --version
echo.

echo [2/5] Checking Firebase login status...
firebase login:list
echo.

REM Prompt for confirmation
echo [3/5] Ready to deploy security rules
echo.
echo This will update:
echo   - Firestore Security Rules
echo.
set /p CONFIRM="Continue with deployment? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo [4/5] Deploying Firestore security rules...
firebase deploy --only firestore:rules

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Deployment failed!
    echo.
    echo Common issues:
    echo   1. Not logged in: Run 'firebase login'
    echo   2. Wrong project: Run 'firebase use jpcopanel'
    echo   3. Insufficient permissions: Check IAM roles
    echo.
    pause
    exit /b 1
)

echo.
echo [5/5] Verifying deployment...
firebase firestore:rules:list

echo.
echo ========================================
echo   DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Security rules have been updated.
echo.
echo Next steps:
echo   1. Test authentication in your app
echo   2. Monitor Firebase Console for errors
echo   3. Review audit logs
echo.
pause
