# Firebase Error Diagnosis and Fix

## Problem
The application is showing an error when trying to fetch employees:
```
Error in employeeService.getAll: {}
```

The error object is empty, which makes it difficult to diagnose the root cause.

## Changes Made

### 1. Enhanced Error Logging in `employee.service.ts`
Added detailed error logging to capture:
- Error type and constructor
- Error keys and properties
- Error message and code
- Filter parameters used in the query

### 2. Improved Error Handling in `firebase.service.ts`
- Added comprehensive error logging in `handleError` method
- Added more detailed error messages for common Firebase errors
- Added logging in `getAll` method to show which collection is being queried
- Added `failed-precondition` error handling for missing indexes

### 3. Created Diagnostic Script
Created `scripts/test-firebase-connection.ts` to test Firebase connectivity independently.

## Common Causes and Solutions

### 1. **Firestore Security Rules** (Most Likely)
If you see `permission-denied` error, your Firestore security rules are blocking access.

**Solution for Development:**
Go to Firebase Console → Firestore Database → Rules and set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Warning:** This allows all access. For production, implement proper authentication-based rules.

**Production Rules Example:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /employees/{employeeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     (request.auth.token.role == 'admin' || 
                      request.auth.token.role == 'manager');
    }
  }
}
```

### 2. **Missing Composite Index**
If you see `failed-precondition` error, you need to create a composite index.

**Solution:**
- Check the browser console for a link to create the index
- Click the link to automatically create the required index in Firebase Console
- Or manually create the index: Firebase Console → Firestore Database → Indexes

### 3. **Empty Collection**
If the collection doesn't exist or is empty, the query will succeed but return no results.

**Solution:**
- Check Firebase Console → Firestore Database → Data
- Verify the `employees` collection exists
- Add test data if needed

### 4. **Network/Authentication Issues**
If Firebase isn't initialized properly or there's no network connection.

**Solution:**
- Check browser console for Firebase initialization errors
- Verify Firebase config in `src/lib/firebase.ts`
- Check network connectivity
- Ensure user is authenticated if required by security rules

## Next Steps

1. **Check the browser console** for the enhanced error logs
2. **Look for specific error codes:**
   - `permission-denied` → Fix security rules
   - `failed-precondition` → Create required index
   - `unauthenticated` → Ensure user is logged in
   - `unavailable` → Check network/Firebase status

3. **Verify Firestore setup:**
   - Go to Firebase Console
   - Check if Firestore is enabled
   - Check if the `employees` collection exists
   - Review security rules

4. **Test with the diagnostic script** (optional):
   ```bash
   npm install -D tsx
   npm run test:firebase
   ```

## Monitoring

The enhanced error logging will now show:
- Detailed error information in the console
- The collection being queried
- Filter parameters being used
- Error type, code, and message

Check your browser's developer console for these detailed logs to identify the exact issue.
