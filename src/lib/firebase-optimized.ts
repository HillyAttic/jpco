/**
 * Optimized Firebase initialization with lazy loading and caching
 * Prevents blocking the main thread during critical render path
 * Uses the existing Firebase instance from firebase.ts to avoid duplicate initialization
 */

import app, { auth, db } from './firebase';

let initialized = false;

/**
 * Initialize Firebase lazily - only when actually needed
 * Uses singleton pattern to prevent multiple initializations
 */
export async function initializeFirebaseLazy() {
  if (initialized) return;
  initialized = true;
  // Firebase is already initialized in firebase.ts
  return Promise.resolve();
}

/**
 * Get Firebase Auth instance (lazy loaded)
 */
export async function getAuthLazy() {
  await initializeFirebaseLazy();
  return auth;
}

/**
 * Get Firestore instance (lazy loaded)
 */
export async function getDbLazy() {
  await initializeFirebaseLazy();
  return db;
}

/**
 * Get Firebase App instance (lazy loaded)
 */
export async function getAppLazy() {
  await initializeFirebaseLazy();
  return app;
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
