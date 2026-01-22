# Location Capture Debugging Guide

## Issue Description
The Google Maps modal is showing incorrect coordinates (28.6390, 77.2360) instead of the actual current location (28.687580, 77.344978).

## Root Cause Analysis

The issue is likely one of the following:

1. **Old/Cached Data**: The attendance records in Firestore contain old location data from a previous session
2. **Location Permission Issues**: The browser might be using cached location or approximate location
3. **Data Flow Issue**: Location data might be getting corrupted somewhere in the data flow

## Data Flow

```
Browser Geolocation API
  ↓
GeolocationAttendanceTracker.getCurrentLocation()
  ↓ (returns { lat, lng, accuracy })
handleClockIn/handleClockOut
  ↓ (converts to { latitude, longitude, accuracy })
attendanceService.clockIn/clockOut
  ↓
validateLocationData() - validates and normalizes
  ↓
Firestore (stored as location.clockIn or location.clockOut)
  ↓
AttendanceHistoryList (reads from Firestore)
  ↓
LocationMapModal (displays on map)
```

## Changes Made

### 1. Enhanced Logging in GeolocationAttendanceTracker.tsx
- Added detailed console logs to show raw location data captured
- Added validation to ensure lat/lng are valid numbers before sending
- Added explicit location data object creation

### 2. Enhanced Logging in attendance.service.ts
- Added detailed logging in `clockIn()` and `clockOut()` methods
- Enhanced `validateLocationData()` function with logging
- Shows exactly what data is received and what is being stored

### 3. Created LocationDiagnostic Component
- Temporary debugging tool to inspect actual Firestore data
- Shows raw location data structure from database

## How to Debug

### Step 1: Add Diagnostic Component (Temporary)
Add this to your attendance page to inspect the data:

```tsx
import { LocationDiagnostic } from '@/components/attendance/LocationDiagnostic';

// Add in your page component
<LocationDiagnostic />
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Clock in or clock out
4. Look for these log messages:
   - "Location obtained - Raw:"
   - "Sending location data to service:"
   - "validateLocationData called with:"
   - "Creating attendance record with location:"

### Step 3: Verify Actual Coordinates
Compare the coordinates at each step:
- What the browser captures
- What gets sent to the service
- What gets validated
- What gets stored in Firestore
- What gets displayed in the UI

### Step 4: Check Firestore Directly
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Open `attendance-records` collection
4. Find your recent record
5. Check the `location` field structure:
   ```json
   {
     "clockIn": {
       "latitude": 28.687580,
       "longitude": 77.344978,
       "accuracy": 20
     }
   }
   ```

## Common Issues and Solutions

### Issue 1: Browser Using Cached Location
**Solution**: 
- Clear browser cache and location permissions
- Revoke and re-grant location permission
- Use incognito/private mode to test

### Issue 2: Approximate Location
**Solution**:
- Ensure GPS is enabled on device
- Use `enableHighAccuracy: true` in geolocation options (already set)
- Wait for GPS to get accurate fix (may take 10-30 seconds)

### Issue 3: Old Data in Firestore
**Solution**:
- Delete old attendance records from Firestore
- Clock in fresh to create new record with current location
- Use the diagnostic tool to verify new data

### Issue 4: HTTPS Required
**Solution**:
- Geolocation API requires HTTPS (or localhost)
- Ensure you're accessing via https:// or http://localhost

## Testing Steps

1. **Clear Old Data**:
   ```
   - Delete today's attendance records from Firestore
   - Clear browser cache
   - Revoke location permission and re-grant
   ```

2. **Fresh Clock In**:
   ```
   - Open browser console
   - Click "Clock In"
   - Watch console logs
   - Verify coordinates at each step
   ```

3. **Verify in UI**:
   ```
   - Go to Attendance History
   - Click on location coordinates
   - Verify map shows correct location
   ```

4. **Use Diagnostic Tool**:
   ```
   - Add LocationDiagnostic component
   - Click "Check Location Data"
   - Inspect the JSON output
   ```

## Expected Console Output

When clocking in, you should see:
```
Starting clock in process...
Location obtained - Raw: { lat: 28.687580, lng: 77.344978, accuracy: 20 }
Location lat: 28.687580 lng: 77.344978
Sending location data to service: { latitude: 28.687580, longitude: 77.344978, accuracy: 20 }
Clock in attempt for employee: [user-id]
Clock in data received: { ... location: { latitude: 28.687580, longitude: 77.344978, accuracy: 20 } }
validateLocationData called with: { latitude: 28.687580, longitude: 77.344978, accuracy: 20 }
validateLocationData: Valid latitude/longitude format: { latitude: 28.687580, longitude: 77.344978, accuracy: 20 }
Creating attendance record with location: { clockIn: { latitude: 28.687580, longitude: 77.344978, accuracy: 20 } }
```

## Next Steps

1. Test with the enhanced logging
2. Check console output during clock in/out
3. Use diagnostic tool to inspect Firestore data
4. If issue persists, share console logs for further analysis
5. Once resolved, remove the LocationDiagnostic component

## Cleanup After Debugging

Once the issue is resolved, you can:
1. Remove the LocationDiagnostic component
2. Optionally reduce the console.log statements (keep critical ones)
3. Delete this debug guide file
