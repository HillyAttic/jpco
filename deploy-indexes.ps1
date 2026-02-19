#!/usr/bin/env pwsh

Write-Host "Deploying Firestore indexes..." -ForegroundColor Cyan
firebase deploy --only firestore:indexes

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nIndexes deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nIndex deployment failed!" -ForegroundColor Red
    exit 1
}
