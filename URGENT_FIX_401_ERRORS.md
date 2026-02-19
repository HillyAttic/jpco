# 🚨 URGENT: Fix 401 Unauthorized Errors

## Problem

Your frontend is getting 401 errors because it's **not sending the Authorization header** with API requests.

```
Failed to load resource: 401 (Unauthorized)
api/notifications?userId=xxx
api/tasks
```

## Root Cause

We added authentication to the API routes, but the **frontend code hasn't been updated** to send the Firebase ID token with requests.

## Quick Fix (5 minutes)

### Step 1: Create API Client Helper

Create `src/lib/api-client.ts`:

```typescript
import { auth } from '@/lib/firebase';

/**
 * Make authenticated API requests
 * Automatically adds Firebase ID token to Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get fresh ID token
    const token = await user.getIdToken();

    // Add Authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
}

/**
 * Helper for GET requests
 */
export async function apiGet(url: string): Promise<any> {
  const response = await authenticatedFetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Helper for POST requests
 */
export async function apiPost(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Helper for PUT requests
 */
export async function apiPut(url: string, data: any): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete(url: string): Promise<any> {
  const response = await authenticatedFetch(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
```

### Step 2: Update task.api.ts

Find `src/services/task.api.ts` and update it:

**Before:**
```typescript
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const response = await fetch(url);
  // ...
}
```

**After:**
```typescript
import { authenticatedFetch } from '@/lib/api-client';

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const response = await authenticatedFetch(url);
  // ...
}
```

### Step 3: Update use-notifications.ts

Find `src/hooks/use-notifications.ts` (or wherever notifications are fetched) and update:

**Before:**
```typescript
const response = await fetch(`/api/notifications?userId=${userId}`);
```

**After:**
```typescript
import { authenticatedFetch } from '@/lib/api-client';

const response = await authenticatedFetch(`/api/notifications?userId=${userId}`);
```

## Complete Fix (30 minutes)

Update ALL files that make API calls:

### Files to Update:

1. **src/services/task.api.ts** - Task operations
2. **src/hooks/use-notifications.ts** - Notifications
3. **src/services/employee.service.ts** - Employee operations (if calling API)
4. **src/services/client.service.ts** - Client operations (if calling API)
5. **src/services/category.service.ts** - Category operations (if calling API)
6. **Any component making direct fetch() calls to /api/**

### Pattern to Follow:

**Find:**
```typescript
fetch('/api/...')
```

**Replace with:**
```typescript
import { authenticatedFetch } from '@/lib/api-client';
authenticatedFetch('/api/...')
```

## Testing

After updating, test:

1. **Login** to your app
2. **Navigate** to dashboard
3. **Check console** - should see no 401 errors
4. **Verify** data loads correctly

## Why This Happened

When we added authentication to API routes, we made them require the `Authorization: Bearer <token>` header. But the frontend code was still making requests without this header, causing 401 errors.

## Alternative: Temporary Bypass (NOT RECOMMENDED)

If you need the app working immediately while you update the frontend, you can temporarily comment out the authentication checks in the API routes. But this is **NOT SECURE** and should only be done for testing.

**DO NOT DO THIS IN PRODUCTION!**

## Next Steps

1. Create `src/lib/api-client.ts` (5 min)
2. Update `task.api.ts` (5 min)
3. Update `use-notifications.ts` (5 min)
4. Test the app (5 min)
5. Update remaining API calls (15 min)

---

**Priority: URGENT** - Your app is currently broken due to 401 errors.
