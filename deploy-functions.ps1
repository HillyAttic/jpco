# Firebase Cloud Functions Deployment Script
# PowerShell version

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Cloud Functions Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Firebase CLI
Write-Host "Step 1: Checking Firebase CLI..." -ForegroundColor Yellow
try {
    $version = firebase --version
    Write-Host "✓ Firebase CLI installed: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Please run: npm install -g firebase-tools" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Step 2: Login to Firebase
Write-Host "Step 2: Logging in to Firebase..." -ForegroundColor Yellow
Write-Host "(Browser will open - please login)" -ForegroundColor Cyan
firebase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ERROR: Login failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Logged in successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Initialize Firebase Functions
Write-Host "Step 3: Initializing Firebase Functions..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: When prompted, answer:" -ForegroundColor Cyan
Write-Host "- Features: Select 'Functions'" -ForegroundColor White
Write-Host "- Project: Select 'jpcopanel'" -ForegroundColor White
Write-Host "- Language: Select 'JavaScript'" -ForegroundColor White
Write-Host "- ESLint: Type 'N' (No)" -ForegroundColor White
Write-Host "- Install dependencies: Type 'Y' (Yes)" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"

firebase init functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ERROR: Initialization failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Functions initialized" -ForegroundColor Green
Write-Host ""

# Step 4: Copy Cloud Function code
Write-Host "Step 4: Copying Cloud Function code..." -ForegroundColor Yellow
if (Test-Path "firebase-functions-example.js") {
    Copy-Item "firebase-functions-example.js" "functions\index.js" -Force
    Write-Host "✓ Code copied to functions\index.js" -ForegroundColor Green
} else {
    Write-Host "✗ ERROR: firebase-functions-example.js not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Step 5: Install dependencies
Write-Host "Step 5: Installing dependencies..." -ForegroundColor Yellow
Push-Location functions
npm install firebase-admin firebase-functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ERROR: Failed to install dependencies!" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Pop-Location
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy Cloud Functions
Write-Host "Step 6: Deploying Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ERROR: Deployment failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Success message
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your Cloud Functions are now deployed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test background notifications" -ForegroundColor White
Write-Host "2. Check Firebase Console for function status" -ForegroundColor White
Write-Host "3. View logs: firebase functions:log" -ForegroundColor White
Write-Host ""
Write-Host "See DEPLOY_CLOUD_FUNCTIONS.md for testing instructions." -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
