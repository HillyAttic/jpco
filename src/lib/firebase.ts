// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Note: Only importing storage if you plan to use it
// import { getStorage } from 'firebase/storage'; 

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
export const db = getFirestore(app);
// export const storage = getStorage(app); // Uncomment if you plan to use Firebase Storage
export const googleProvider = new GoogleAuthProvider();

export default app;