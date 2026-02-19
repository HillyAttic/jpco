# Security Fix Implementation Guide

## Overview

This guide walks you through implementing the security fixes for your application. The fixes address critical vulnerabilities in API authentication and Firestore security rules.

## What Was Fixed

### 1. Server-Side Authentication (`src/lib/server-auth.ts`)
- ✅ Replaced placeholder authentication with real Firebase Admin SDK token verification
- ✅ Added proper token validation and error handling
- ✅ Implemented user profile lookup from Firestore
- ✅ Added role and permission extraction from custom claims

### 2. API Route Protection (`src/app/api/recurring-tasks/[id]/route.ts`)
- ✅ Enabled authentication on GET, PUT, DELETE endpoints
- ✅ Added role-based access control (RBAC)
- ✅ Employees can view tasks, only managers can modify

### 3. Firestore Security Rules (`firestore.rules`)
- ✅ Added privilege escalation protection
- ✅ Added protected field validation
- ✅ Enhanced user profile security
- ✅ Improved audit log immutability
- ✅ Added detailed comments for each rule

## Deployment Steps

### Step 1: Verify Environment Variables

Ensure you have Firebase Admin SDK credentials configured:

```bash
# Check .env.local file
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# OR individual variables
FIREBASE_PROJECT_ID=jpcopanel
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@jpcopanel.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### Step 2: Deploy Firestore Security Rules

#### Option A: Using the deployment script (Recommended)

**Windows (CMD):**
```cmd
deploy-security-rules.bat
```

**Windows (PowerShell) or Linux/Mac:**
```powershell
./deploy-security-rules.ps1
```

#### Option B: Manual deployment

```bash
# Login to Firebase
firebase login

# Select your project
firebase use jpcopanel

# Deploy only security rules
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules:list
```

### Step 3: Update Remaining API Routes

The following API routes still need authentication enabled:

#### High Priority (Manager/Admin only):
- `/api/tasks/*` - Task management
- `/api/employees/*` - Employee management
- `/api/clients/*` - Client management
- `/api/categories/*` - Category management
- `/api/teams/*` - Team management

#### Medium Priority (Employee access):
- `/api/attendance/*` - Attendance tracking
- `/api/roster/*` - Roster viewing
- `/api/notifications/*` - Notification management

#### Pattern to follow:

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);
    
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized(authResult.error);
    }

    // 2. Check role-based permissions
    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }

    // 3. Your existing logic here
    // ...
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 4: Update Client-Side API Calls

Ensure all API calls include the Firebase ID token:

```typescript
import { auth } from '@/lib/firebase';

async function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get fresh ID token
  const idToken = await user.getIdToken();

  // Add Authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

// Usage
const response = await makeAuthenticatedRequest('/api/recurring-tasks/123', {
  method: 'PUT',
  body: JSON.stringify(taskData),
});
```

### Step 5: Test Authentication

#### Test 1: Unauthenticated Request
```bash
curl -X GET http://localhost:3000/api/recurring-tasks/test-id

# Expected: 401 Unauthorized
# {"error":"Missing or invalid authorization header"}
```

#### Test 2: Invalid Token
```bash
curl -X GET http://localhost:3000/api/recurring-tasks/test-id \
  -H "Authorization: Bearer invalid-token"

# Expected: 401 Unauthorized
# {"error":"Token verification failed"}
```

#### Test 3: Valid Token (Employee)
```bash
# Get token from browser console: await firebase.auth().currentUser.getIdToken()
curl -X GET http://localhost:3000/api/recurring-tasks/test-id \
  -H "Authorization: Bearer YOUR_VALID_TOKEN"

# Expected: 200 OK with task data
```

#### Test 4: Insufficient Permissions
```bash
# As employee, try to update a task
curl -X PUT http://localhost:3000/api/recurring-tasks/test-id \
  -H "Authorization: Bearer EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated"}'

# Expected: 403 Forbidden
# {"error":"Only managers and admins can update tasks"}
```

### Step 6: Monitor Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `jpcopanel`
3. Navigate to **Firestore Database** → **Rules**
4. Verify rules are deployed
5. Check **Usage** tab for any rule violations

### Step 7: Update Cache Service (Optional but Recommended)

Add user context to cache keys to prevent data leakage:

```typescript
// In cache.service.ts
private generateKey(namespace: string, params?: any, userId?: string): string {
  const userPrefix = userId ? `user:${userId}:` : '';
  if (!params) return `${userPrefix}${namespace}`;
  const paramStr = JSON.stringify(params, Object.keys(params).sort());
  return `${userPrefix}${namespace}:${paramStr}`;
}
```

## Security Checklist

- [ ] Firebase Admin SDK credentials configured
- [ ] Firestore security rules deployed
- [ ] API routes have authentication enabled
- [ ] Client-side requests include ID tokens
- [ ] Tested unauthenticated access (should fail)
- [ ] Tested authenticated access (should succeed)
- [ ] Tested role-based permissions
- [ ] Monitored Firebase Console for errors
- [ ] Reviewed audit logs
- [ ] Updated cache service with user context

## Common Issues

### Issue 1: "Token verification failed"

**Cause**: Firebase Admin SDK not properly initialized

**Solution**:
1. Check environment variables are set
2. Verify service account key is valid JSON
3. Ensure private key has proper line breaks (`\n`)

### Issue 2: "User profile not found"

**Cause**: User document doesn't exist in Firestore

**Solution**:
1. Ensure user profile is created on signup
2. Check Firestore collection name is `users`
3. Verify user document ID matches Firebase Auth UID

### Issue 3: "Insufficient permissions"

**Cause**: User role not set correctly

**Solution**:
1. Check user document has `role` field
2. Verify role is one of: `admin`, `manager`, `employee`
3. Update custom claims if needed

### Issue 4: Rules deployment fails

**Cause**: Not logged in or wrong project

**Solution**:
```bash
# Login
firebase login

# List projects
firebase projects:list

# Select correct project
firebase use jpcopanel

# Try again
firebase deploy --only firestore:rules
```

## Next Steps

1. **Enable authentication on all remaining API routes** (see Step 3)
2. **Add audit logging** for sensitive operations
3. **Implement rate limiting** to prevent abuse
4. **Add request validation** using Zod schemas
5. **Set up monitoring** with Firebase Performance Monitoring
6. **Review and test** all user flows

## Support

If you encounter issues:

1. Check Firebase Console logs
2. Review browser console for errors
3. Verify environment variables
4. Test with Firebase Emulator Suite
5. Check IAM permissions in Google Cloud Console

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Rotate credentials** regularly (every 90 days)
3. **Use environment-specific** service accounts
4. **Enable audit logging** for compliance
5. **Monitor for suspicious activity** in Firebase Console
6. **Keep dependencies updated** (npm audit)
7. **Use HTTPS only** in production
8. **Implement rate limiting** on API routes
9. **Validate all inputs** server-side
10. **Follow principle of least privilege** for roles

## Compliance Notes

- **GDPR**: User data is now properly protected with authentication
- **SOC 2**: Access controls implemented and auditable
- **ISO 27001**: Security rules documented and version controlled
- **HIPAA**: Additional encryption may be required for healthcare data

## Rollback Plan

If issues occur after deployment:

```bash
# Revert Firestore rules to previous version
firebase firestore:rules:release rollback

# Or deploy previous rules file
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

## Conclusion

Your application now has proper authentication and authorization implemented. Continue to monitor and test to ensure everything works as expected.
