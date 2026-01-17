import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  ReactNode,
  useCallback 
} from 'react';
import { 
  User, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  AuthError,
  onIdTokenChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  AuthContextType, 
  UserProfile, 
  CustomClaims, 
  AuthResult, 
  SignUpData, 
  UserRole 
} from '@/types/auth.types';
import { roleManagementService } from '@/services/role-management.service';

const EnhancedAuthContext = createContext<AuthContextType | undefined>(undefined);

export const useEnhancedAuth = (): AuthContextType => {
  const context = useContext(EnhancedAuthContext);
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

interface EnhancedAuthProviderProps {
  children: ReactNode;
}

export const EnhancedAuthProvider: React.FC<EnhancedAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<CustomClaims | null>(null);

  // Derived state for role checks
  const isAdmin = claims?.role === 'admin' || false;
  const isManager = claims?.role === 'manager' || isAdmin;
  const isEmployee = claims?.role === 'employee' || isManager;

  /**
   * Load user profile and claims
   */
  const loadUserData = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserProfile(null);
      setClaims(null);
      return;
    }

    try {
      // Load user profile from Firestore
      const profile = await roleManagementService.getUserProfile(currentUser.uid);
      setUserProfile(profile);

      // Get ID token to extract custom claims
      const idTokenResult = await currentUser.getIdTokenResult();
      const customClaims: CustomClaims = {
        role: (idTokenResult.claims.role as UserRole) || profile?.role || 'employee',
        permissions: (idTokenResult.claims.permissions as string[]) || profile?.permissions || [],
        isAdmin: (idTokenResult.claims.isAdmin as boolean) || profile?.role === 'admin' || false,
        createdAt: idTokenResult.claims.createdAt as string || new Date().toISOString(),
        lastRoleUpdate: idTokenResult.claims.lastRoleUpdate as string || new Date().toISOString(),
      };

      setClaims(customClaims);
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default claims if loading fails
      setClaims({
        role: 'employee',
        permissions: [],
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastRoleUpdate: new Date().toISOString(),
      });
    }
  }, []);

  /**
   * Refresh user claims
   */
  const refreshClaims = useCallback(async () => {
    if (user) {
      try {
        // Force token refresh
        await user.getIdToken(true);
        await loadUserData(user);
      } catch (error) {
        console.error('Error refreshing claims:', error);
      }
    }
  }, [user, loadUserData]);

  /**
   * Set up authentication state listener
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await loadUserData(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [loadUserData]);

  /**
   * Set up token refresh listener
   */
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (currentUser && user) {
        await loadUserData(currentUser);
      }
    });

    return unsubscribe;
  }, [user, loadUserData]);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time
      if (userCredential.user) {
        await roleManagementService.updateUserProfile(userCredential.user.uid, {
          lastLogin: new Date() as any,
        });
      }

      return { 
        success: true, 
        user: userCredential.user 
      };
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An error occurred during sign in';
      
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          errorMessage = authError.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  /**
   * Sign up new user
   */
  const signUp = async (userData: SignUpData): Promise<AuthResult> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );

      // Create user profile in Firestore
      await roleManagementService.createUserProfile(userCredential.user.uid, {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role || 'employee',
        department: userData.department,
        phoneNumber: userData.phoneNumber,
        createdBy: userCredential.user.uid,
      });

      return { 
        success: true, 
        user: userCredential.user 
      };
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An error occurred during registration';
      
      switch (authError.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email address is already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = authError.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  /**
   * Sign out user
   */
  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setClaims(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'An error occurred during password reset';
      
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        default:
          errorMessage = authError.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!claims) return false;
    return claims.permissions.includes(permission);
  }, [claims]);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!claims) return false;
    if (Array.isArray(role)) {
      return role.includes(claims.role);
    }
    return claims.role === role;
  }, [claims]);

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    claims,
    isAdmin,
    isManager,
    isEmployee,
    signIn,
    signUp,
    signOut,
    refreshClaims,
    resetPassword,
    hasPermission,
    hasRole,
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};