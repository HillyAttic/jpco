/**
 * Utility to sync user roles from Firestore to Firebase Auth custom claims
 * This fixes the issue where all users appear as "employee"
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/lib/firebase';

const functions = getFunctions(app, 'asia-south2'); // Match your Cloud Functions region

/**
 * Sync all user roles from Firestore to Firebase Auth
 * This should be called once by an admin to fix existing users
 */
export async function syncAllUserRoles(): Promise<{
  success: boolean;
  message: string;
  successCount?: number;
  errorCount?: number;
  errors?: any[];
}> {
  try {
    const syncFunction = httpsCallable(functions, 'syncAllUserRoles');
    const result = await syncFunction();
    
    console.log('Sync result:', result.data);
    return result.data as any;
  } catch (error: any) {
    console.error('Error syncing user roles:', error);
    throw new Error(error.message || 'Failed to sync user roles');
  }
}

/**
 * Set custom claims for a specific user
 * This is called when updating a user's role
 */
export async function setUserClaims(
  uid: string,
  role: string,
  permissions: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const setClaimsFunction = httpsCallable(functions, 'setUserClaims');
    const result = await setClaimsFunction({ uid, role, permissions });
    
    console.log('Set claims result:', result.data);
    return result.data as any;
  } catch (error: any) {
    console.error('Error setting user claims:', error);
    throw new Error(error.message || 'Failed to set user claims');
  }
}
