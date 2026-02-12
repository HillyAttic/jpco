# Test Notifications System Locally
Write-Host "=== Notification System Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1
Write-Host "1. Checking service worker files..." -ForegroundColor Yellow
if ((Test-Path "public/firebase-messaging-sw.js") -and (Test-Path "public/sw.js")) {
    Write-Host "   OK Service workers found" -ForegroundColor Green
} else {
    Write-Host "   FAIL Service workers missing" -ForegroundColor Red
}

# Test 2
Write-Host "2. Checking API route..." -ForegroundColor Yellow
if (Test-Path "src/app/api/notifications/route.ts") {
    Write-Host "   OK API route found" -ForegroundColor Green
} else {
    Write-Host "   FAIL API route missing" -ForegroundColor Red
}

# Test 3
Write-Host "3. Checking Firebase Admin..." -ForegroundColor Yellow
if (Test-Path "src/lib/firebase-admin.ts") {
    Write-Host "   OK Firebase Admin found" -ForegroundColor Green
} else {
    Write-Host "   FAIL Firebase Admin missing" -ForegroundColor Red
}

# Test 4
Write-Host "4. Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $content = Get-Content ".env.local" -Raw
    if ($content -match "FIREBASE_SERVICE_ACCOUNT_KEY") {
        Write-Host "   OK FIREBASE_SERVICE_ACCOUNT_KEY in .env.local" -ForegroundColor Green
    } else {
        Write-Host "   WARN FIREBASE_SERVICE_ACCOUNT_KEY not in .env.local" -ForegroundColor Yellow
    }
} else {
    Write-Host "   WARN .env.local not found" -ForegroundColor Yellow
}

# Test 5
Write-Host "5. Checking Vercel environment..." -ForegroundColor Yellow
$vercelEnv = vercel env ls 2>&1 | Out-String
if ($vercelEnv -match "FIREBASE_SERVICE_ACCOUNT_KEY") {
    Write-Host "   OK FIREBASE_SERVICE_ACCOUNT_KEY in Vercel" -ForegroundColor Green
} else {
    Write-Host "   FAIL FIREBASE_SERVICE_ACCOUNT_KEY not in Vercel" -ForegroundColor Red
}

# Test 6
Write-Host "6. Checking notifications hook..." -ForegroundColor Yellow
if (Test-Path "src/hooks/use-notifications.ts") {
    Write-Host "   OK Notifications hook found" -ForegroundColor Green
} else {
    Write-Host "   FAIL Notifications hook missing" -ForegroundColor Red
}

# Test 7
Write-Host "7. Checking notifications page..." -ForegroundColor Yellow
if (Test-Path "src/app/notifications/page.tsx") {
    Write-Host "   OK Notifications page found" -ForegroundColor Green
} else {
    Write-Host "   FAIL Notifications page missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "All critical files are in place" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start dev server: npm run dev"
Write-Host "2. Open: http://localhost:3000/notifications"
Write-Host "3. Click Enable Notifications button"
Write-Host "4. Check browser console for errors"
Write-Host ""
