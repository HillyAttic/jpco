#!/usr/bin/env pwsh
# ============================================================================
# Security Rules Deployment Script (PowerShell)
# Deploys updated Firestore security rules using Firebase CLI
# ============================================================================

Write-Host ""
Write-Host "========================================"
Write-Host "  FIREBASE SECURITY RULES DEPLOYMENT"
Write-Host "========================================"
Write-Host ""

# Check if Firebase CLI is installed
$firebaseCli = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCli) {
    Write-Host "[ERROR] Firebase CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it using:"
    Write-Host "  npm install -g firebase-tools"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/5] Checking Firebase CLI version..."
firebase --version
Write-Host ""

Write-Host "[2/5] Checking Firebase login status..."
firebase login:list
Write-Host ""

# Prompt for confirmation
Write-Host "[3/5] Ready to deploy security rules"
Write-Host ""
Write-Host "This will update:"
Write-Host "  - Firestore Security Rules"
Write-Host ""
$confirm = Read-Host "Continue with deployment? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment cancelled."
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "[4/5] Deploying Firestore security rules..."
firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:"
    Write-Host "  1. Not logged in: Run 'firebase login'"
    Write-Host "  2. Wrong project: Run 'firebase use jpcopanel'"
    Write-Host "  3. Insufficient permissions: Check IAM roles"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[5/5] Verifying deployment..."
firebase firestore:rules:list

Write-Host ""
Write-Host "========================================"
Write-Host "  DEPLOYMENT SUCCESSFUL!"
Write-Host "========================================"
Write-Host ""
Write-Host "Security rules have been updated."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Test authentication in your app"
Write-Host "  2. Monitor Firebase Console for errors"
Write-Host "  3. Review audit logs"
Write-Host ""
Read-Host "Press Enter to exit"
