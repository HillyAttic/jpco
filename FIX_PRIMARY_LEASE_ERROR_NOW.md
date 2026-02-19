# 🚀 FIX PRIMARY LEASE ERROR - ACTION PLAN

## ✅ WHAT WAS FIXED

### Root Cause
The attendance roster page was directly accessing Firestore from a client component, causing multi-tab IndexedDB persistence conflicts ("Failed to obtain primary lease" error).

### The Fix
1. **Created a new API route:** `src/app/api/holidays/route.ts`
   - Uses Admin SDK (server-side)
   - No persistence issues
   - Proper authentication

2. **Updated attendance roster page:** `src/app/admin/attendance-roster/page.tsx`
   - Removed direct Firestore access
   - Now calls the holidays API
   - Consistent w