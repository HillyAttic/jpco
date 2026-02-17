/**
 * Optimized Firebase initialization with lazy loading and caching
 * Prevents blocking the main thread during critical render path
 */

let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Firebase lazily - only when actually needed
 * Uses singleton pattern to prevent multiple initializations
 */
export async function initializeFirebaseLazy() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    if (firebaseApp) return;
    
    const { initializeApp } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
    const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await import('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: "AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw",
      authDomain: "jpcopanel.firebaseapp.com",
      projectId: "jpcopanel",
      storageBucket: "jpcopanel.firebasestorage.app",
      messagingSenderId: "492450530050",
      appId: "1:492450530050:web:174cf5cec2a9bdaeb8381b",
      measurementId: "G-GNT1N7174R"
    };
    
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  })();
  
  return initPromise;
}

/**
 * Get Firebase Auth instance (lazy loaded)
 */
export async function getAuthLazy() {
  await initializeFirebaseLazy();
  return firebaseAuth;
}

/**
 * Get Firestore instance (lazy loaded)
 */
export async function getDbLazy() {
  await initializeFirebaseLazy();
  return firebaseDb;
}

/**
 * Get Firebase App instance (lazy loaded)
 */
export async function getAppLazy() {
  await initializeFirebaseLazy();
  return firebaseApp;
}

/**
 * Preload Firebase in the background (non-blocking)
 * Call this during idle time to warm up the cache
 */
export function preloadFirebase() {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      initializeFirebaseLazy().catch(console.error);
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      initializeFirebaseLazy().catch(console.error);
    }, 100);
  }
}
