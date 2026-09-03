// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';
// Import storage for profile photos
import { getStorage } from 'firebase/storage';

// Suppress non-critical Firestore warnings in production
// The "Failed to obtain primary lease" warning is expected with multi-tab support
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  setLogLevel('error'); // Only show errors, not warnings
}

// Filter out the "Failed to obtain primary lease" warning in development
// This is a non-critical informational message about multi-tab coordination
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Failed to obtain primary lease')) {
      // Suppress this specific warning - it's expected behavior with multi-tab support
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkxT1xMRCj2iAoig87tBkFXSGcoZyuQDw",
  authDomain: "jpcopanel.firebaseapp.com",
  projectId: "jpcopanel",
  storageBucket: "jpcopanel.firebasestorage.app",
  messagingSenderId: "492450530050",
  appId: "1:492450530050:web:174cf5cec2a9bdaeb8381b",
  measurementId: "G-GNT1N7174R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with persistent local cache for offline support.
// Uses the default WebSocket/gRPC transport (fast QUIC) with automatic
// fallback to long-polling when the QUIC connection is unstable.
// NOTE: experimentalForceLongPolling was REMOVED — it caused extreme
// slowness on mobile by forcing repeated HTTP round-trips. The auto-detect
// variant keeps WebSocket/QUIC when healthy and falls back gracefully.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;