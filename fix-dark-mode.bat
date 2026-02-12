@echo off
echo.
echo ========================================
echo   Dark Mode Auto-Fix Script
echo ========================================
echo.
echo This script will automatically add dark mode classes
echo to all components in your application.
echo.
echo Press any key to start (or Ctrl+C to cancel)...
pause >nul

powershell.exe -ExecutionPolicy Bypass -File "scripts\fix-dark-mode.ps1"

echo.
echo ========================================
echo   Script Complete!
echo ========================================
echo.
echo Please test your application in dark mode.
echo.
pause
