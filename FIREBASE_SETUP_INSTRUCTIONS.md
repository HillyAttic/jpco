# Firebase Setup Instructions

To integrate Firebase with your JPCO dashboard, please follow these steps:

## 1. Install Firebase Dependencies

Run the following command to install Firebase in your project:

```bash
npm install firebase
```

## 2. Replace Placeholder Functions

After installing Firebase, replace the placeholder functions in `src/lib/auth.ts` with the Firebase implementations from `src/lib/firebase-auth.ts`.

## 3. Enable Authentication Methods

In your Firebase Console:
1. Go to Authentication
2. Enable Email/Password sign-in method

## 4. Update Environment Variables (Optional)

For security purposes, consider moving your Firebase configuration to environment variables:

Create a `.env.local` file in your project root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Then update the firebase config in `src/lib/firebase.ts` to use these environment variables:

```javascript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID
};
```

## 5. Firebase Security Rules

For Firestore Database (if you plan to use it), update your security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add other collections as needed
  }
}
```

## 6. Usage in Components

After setting up Firebase, you can use the authentication functions in your components:

```javascript
import { signUp, signIn, requestPasswordReset } from '@/lib/auth';

// For sign up
const result = await signUp(userData);

// For sign in
const result = await signIn(email, password);

// For password reset
const result = await requestPasswordReset(email);
```

## 7. Service Account Key

Your service account key has been saved in the project. This is used for server-side operations if needed.

## 8. Ready to Use

Once Firebase is installed and configured, your authentication pages (Sign Up, Sign In, Forgot Password, Reset Password) will connect to Firebase automatically.

Your Firebase project is already configured with:
- Authentication enabled
- Firestore Database
- Storage
- Analytics