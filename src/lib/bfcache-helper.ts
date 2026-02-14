/**
 * Back/Forward Cache (bfcache) Helper
 * Ensures proper handling of page restoration from bfcache
 */

export function setupBFCacheHandling() {
  if (typeof window === 'undefined') return;

  // Handle page show event (fires when page is restored from bfcache)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Page was restored from bfcache
      console.log('[BFCache] Page restored from cache');
      
      // Refresh any stale data
      window.dispatchEvent(new CustomEvent('bfcache-restore'));
    }
  });

  // Handle page hide event (fires when page might be cached)
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      console.log('[BFCache] Page being cached');
    }
  });

  // Avoid using beforeunload which blocks bfcache
  // Instead use pagehide for cleanup
  window.addEventListener('pagehide', () => {
    // Cleanup code here (but don't prevent caching)
  });

  // Handle freeze/resume events for better mobile support
  document.addEventListener('freeze', () => {
    console.log('[BFCache] Page frozen');
  });

  document.addEventListener('resume', () => {
    console.log('[BFCache] Page resumed');
    window.dispatchEvent(new CustomEvent('bfcache-restore'));
  });
}

/**
 * Hook to listen for bfcache restoration
 */
export function onBFCacheRestore(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener('bfcache-restore', handler);

  return () => {
    window.removeEventListener('bfcache-restore', handler);
  };
}
