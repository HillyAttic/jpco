// Firebase authentication functions
// This file should be used after installing Firebase dependencies

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updatePassword,
  User,
  signOut
} from 'firebase/auth';
import { auth } from './firebase';

export interface SignUpData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * Function for signing up a new user with Firebase
 */
export const signUp = async (data: SignUpData): Promise<{ success: boolean; message?: string; user?: User | null }> => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;
    
    // In a real implementation, you might want to update the user profile with the full name
    // await updateProfile(user, { displayName: data.fullName });
    
    return { 
      success: true, 
      message: 'Account created successfully!', 
      user 
    };
  } catch (error: any) {
    let errorMessage = 'An error occurred during registration';
    
    // Handle specific Firebase errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email address is already in use';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email address is invalid';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    return { 
      success: false, 
      message: errorMessage 
    };
  }
};

/**
 * Function for signing in a user with Firebase
 */
export const signIn = async (email: string, password: string): Promise<{ success: boolean; message?: string; user?: User | null }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    return { 
      success: true, 
      message: 'Signed in successfully!', 
      user 
    };
  } catch (error: any) {
    let errorMessage = 'An error occurred during sign in';
    
    // Handle specific Firebase errors
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No user found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email address is invalid';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    return { 
      success: false, 
      message: errorMessage 
    };
  }
};

/**
 * Function for requesting a password reset
 */
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    
    return { 
      success: true, 
      message: 'Password reset link sent to your email!' 
    };
  } catch (error: any) {
    let errorMessage = 'An error occurred during password reset request';
    
    // Handle specific Firebase errors
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No user found with this email';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email address is invalid';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    return { 
      success: false, 
      message: errorMessage 
    };
  }
};

/**
 * Function for signing out a user
 */
export const signOutUser = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    await signOut(auth);
    
    return { 
      success: true, 
      message: 'Signed out successfully!' 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || 'An error occurred during sign out' 
    };
  }
};