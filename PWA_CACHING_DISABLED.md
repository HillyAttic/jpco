# PWA Caching Disabled

## Overview
All caching has been disabled in the PWA service worker. The application now operates in **network-only mode**, ensuring all requests fetch fresh data from the server.

## Changes Made

### 1. Service Worker (`public/sw.js`)
Completely simplified the service worker to disable all caching:

**Before:**
- Cached static assets on install
- Cached images, API responses, and navigation requests
- Used multiple caching strategies (cache-first, network-first, stale-while-revalidate)
- Maintained multiple cache stores (static, dynamic, images)

**After:**
- No caching on install
- All caches are deleted on activation
- All fetch requests go directly to the network
- No cache stores are created or maintained

### 2. Service Worker Hook (`src/hooks/use-service-worker.ts`)
Disabled the critical resources caching function:

**Before:**
- Automatically cached critical resources when service worker registered
- Logged "Critical resources cached" message

**After:**
- Caching function does nothing
- Logs "Resource caching is disabled" instead
- No resources are cached

## What This Means

### For Development
- ✅ Always get fresh data from the server
- ✅ No stale cache issues
- ✅ Changes reflect immediately
- ✅ No need to manually clear cache

### For Users
- ⚠️ No offline functionality
- ⚠️ Requires active internet connection
- ⚠️ May use more bandwidth
- ⚠️ Slower load times (no cache benefits)

## Console Messages

You will now see these messages instead of caching messages:

```
Service Worker: Installing (caching disabled)...
Service Worker: Activating (clearing all caches)...
Service Worker: Deleting cache [cache-name]
Service Worker: All caches cleared, activated
Service Worker: Loaded (caching disabled, network-only mode)
Resource caching is disabled
```

## How to Re-enable Caching

If you want to re-enable caching in the future:

1. Restore the original `public/sw.js` from git history
2. Restore the original `cacheCriticalResources` function in `src/hooks/use-service-worker.ts`
3. Update the cache version numbers to force a refresh

## Testing

To verify caching is disabled:

1. Open DevTools (F12)
2. Go to Application tab → Cache Storage
3. You should see no caches or they should be empty
4. Go to Network tab
5. Reload the page
6. All requests should show "from network" (not "from cache")

## Clearing Existing Caches

The service worker will automatically clear all existing caches when it activates. To force this:

1. Open DevTools (F12)
2. Go to Application tab → Service Workers
3. Click "Unregister" on the old service worker
4. Refresh the page
5. The new service worker will install and clear all caches

Or manually:

1. Open DevTools (F12)
2. Go to Application tab → Cache Storage
3. Right-click each cache and select "Delete"
4. Or click "Clear storage" and check "Cache storage"

## Notes

- The service worker is still registered (for PWA install functionality)
- Push notifications and background sync still work
- Only caching is disabled, not the entire service worker
- This is ideal for development but not recommended for production
