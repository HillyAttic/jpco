import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { roleManagementService } from "@/services/role-management.service";

/**
 * Utility function to create test admin user
 * This can be called from browser console for testing
 */
export const createTestAdmin = async () => {
  try {
    console.log('Creating test admin user...');
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      "admin@gmail.com", 
      "admin@123"
    );

    console.log('Firebase user created:', userCredential.user.uid);

    // Create user profile in Firestore
    await roleManagementService.createUserProfile(userCredential.user.uid, {
      email: "admin@gmail.com",
      displayName: "Test Admin",
      role: "admin",
      department: "IT",
      createdBy: userCredential.user.uid,
    });

    console.log('✅ Test admin user created successfully!');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin@123');
    console.log('Role: admin');
    
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Test admin user already exists');
      return null;
    }
    console.error('❌ Error creating test admin user:', error);
    throw error;
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).createTestAdmin = createTestAdmin;
}