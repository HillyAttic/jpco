// Self-unregistering stub service worker
// This file replaces the old sw.js to ensure any cached/registered
// instances of the old service worker are properly cleaned up.
// Once this activates, it immediately unregisters itself.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up any caches created by the old sw.js
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('jpco-'))
          .map(name => caches.delete(name))
      );

      // Unregister this service worker itself
      await self.registration.unregister();
      console.log('[SW Stub] Old sw.js unregistered and caches cleaned up');
    })()
  );
});
