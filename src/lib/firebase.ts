// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';
// Note: Only importing storage if you plan to use it
// import { getStorage } from 'firebase/storage'; 

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

// Initialize Firestore with long-polling instead of gRPC/QUIC streaming.
// This fixes ERR_QUIC_PROTOCOL_ERROR.QUIC_TOO_MANY_RTOS errors that occur
// when the network blocks or throttles UDP packets (QUIC uses UDP).
// Long-polling uses standard HTTP (TCP) which works on all networks.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
// export const storage = getStorage(app); // Uncomment if you plan to use Firebase Storage
export const googleProvider = new GoogleAuthProvider();

export default app;