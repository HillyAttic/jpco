import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { 
  UserProfile, 
  UserRole, 
  InvitationData,
  AuditLog 
} from '@/types/auth.types';
import { roleManagementService } from './role-management.service';

export interface UserListOptions {
  limit?: number;
  startAfter?: DocumentSnapshot;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  searchTerm?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  managerUsers: number;
  employeeUsers: number;
  recentSignups: number;
}

export class UserManagementService {
  private static instance: UserManagementService;

  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * Get all users with optional filtering and pagination
   */
  async getAllUsers(options: UserListOptions = {}): Promise<{
    users: UserProfile[];
    hasMore: boolean;
    lastDoc?: DocumentSnapshot;
  }> {
    try {
      let q = query(collection(db, 'users'));

      // Apply filters
      if (options.role) {
        q = query(q, where('role', '==', options.role));
      }

      if (options.department) {
        q = query(q, where('department', '==', options.department));
      }

      if (options.isActive !== undefined) {
        q = query(q, where('isActive', '==', options.isActive));
      }

      // Apply ordering
      q = query(q, orderBy('createdAt', 'desc'));

      // Apply pagination
      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }

      if (options.limit) {
        q = query(q, limit(options.limit + 1)); // Get one extra to check if there are more
      }

      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      let hasMore = false;
      let lastDoc: DocumentSnapshot | undefined;

      querySnapshot.docs.forEach((doc, index) => {
        if (options.limit && index === options.limit) {
          hasMore = true;
          return;
        }

        const userData = doc.data() as UserProfile;
        
        // Apply search filter if provided
        if (options.searchTerm) {
          const searchLower = options.searchTerm.toLowerCase();
          const matchesSearch = 
            userData.displayName?.toLowerCase().includes(searchLower) ||
            userData.email?.toLowerCase().includes(searchLower) ||
            userData.department?.toLowerCase().includes(searchLower);
          
          if (!matchesSearch) return;
        }

        users.push(userData);
        lastDoc = doc;
      });

      return { users, hasMore, lastDoc };
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const allUsersQuery = query(collection(db, 'users'));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      let totalUsers = 0;
      let activeUsers = 0;
      let adminUsers = 0;
      let managerUsers = 0;
      let employeeUsers = 0;
      let recentSignups = 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      allUsersSnapshot.docs.forEach(doc => {
        const user = doc.data() as UserProfile;
        totalUsers++;

        if (user.isActive) activeUsers++;

        switch (user.role) {
          case 'admin':
            adminUsers++;
            break;
          case 'manager':
            managerUsers++;
            break;
          case 'employee':
            employeeUsers++;
            break;
        }

        if (user.createdAt && user.createdAt.toDate() > thirtyDaysAgo) {
          recentSignups++;
        }
      });

      return {
        totalUsers,
        activeUsers,
        adminUsers,
        managerUsers,
        employeeUsers,
        recentSignups,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    uid: string, 
    updates: Partial<UserProfile>,
    updatedBy: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy,
      });

      // Log the update
      await this.logAuditEvent({
        action: 'user_profile_updated',
        performedBy: updatedBy,
        targetUser: uid,
        details: { updates },
      });
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`User document not found for UID: ${uid}. This may be expected for new users.`);
        // Don't throw error for missing documents - this can happen for new users
        return;
      }
      
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(uid: string, deletedBy: string): Promise<void> {
    try {
      // First, get user data for audit log
      const userProfile = await roleManagementService.getUserProfile(uid);
      
      // Delete user document from Firestore
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);

      // Log the deletion
      await this.logAuditEvent({
        action: 'user_deleted',
        performedBy: deletedBy,
        targetUser: uid,
        details: { 
          deletedUser: {
            email: userProfile?.email,
            role: userProfile?.role,
            displayName: userProfile?.displayName,
          }
        },
      });

      // Note: In a real implementation, you would also delete the user from Firebase Auth
      // This requires Firebase Admin SDK on the server side
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Cannot delete user ${uid} - user document not found`);
        return;
      }
      
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Send invitation to new user
   */
  async sendInvitation(
    email: string, 
    role: UserRole,
    invitedBy: string,
    department?: string
  ): Promise<void> {
    try {
      // Create invitation record
      const invitationData: InvitationData = {
        email,
        role,
        department,
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) as any, // 7 days
      };

      const invitationRef = collection(db, 'invitations');
      await addDoc(invitationRef, {
        ...invitationData,
        createdAt: serverTimestamp(),
      });

      // Send password reset email (which can be used as invitation)
      await sendPasswordResetEmail(auth, email);

      // Log the invitation
      await this.logAuditEvent({
        action: 'user_invited',
        performedBy: invitedBy,
        details: { email, role, department },
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw new Error('Failed to send invitation');
    }
  }

  /**
   * Create new user account (admin function)
   */
  async createUser(
    userData: {
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
      department?: string;
      phoneNumber?: string;
    },
    createdBy: string
  ): Promise<User> {
    let userCredential;
    try {
      // Create user in Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Create user profile in Firestore
      await roleManagementService.createUserProfile(userCredential.user.uid, {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        department: userData.department,
        phoneNumber: userData.phoneNumber,
        createdBy,
      });

      // Log the creation
      await this.logAuditEvent({
        action: 'user_created',
        performedBy: createdBy,
        targetUser: userCredential.user.uid,
        details: { 
          email: userData.email,
          role: userData.role,
          department: userData.department,
        },
      });

      return userCredential.user;
    } catch (error: any) {
      // Handle "No document to update" error gracefully
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn(`Cannot create user ${userData.email} - user document not found`);
        if (userCredential) {
          return userCredential.user; // Return user if profile creation failed
        }
      }
      
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: Partial<UserProfile>,
    updatedBy: string
  ): Promise<void> {
    try {
      const updatePromises = userIds.map(uid => 
        this.updateUserProfile(uid, updates, updatedBy)
      );

      await Promise.all(updatePromises);

      // Log bulk update
      await this.logAuditEvent({
        action: 'bulk_user_update',
        performedBy: updatedBy,
        details: { 
          userCount: userIds.length,
          updates,
          userIds,
        },
      });
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw new Error('Failed to bulk update users');
    }
  }

  /**
   * Search users by term
   */
  async searchUsers(searchTerm: string, limit: number = 20): Promise<UserProfile[]> {
    try {
      // Get all users and filter client-side (Firestore doesn't support full-text search)
      const { users } = await this.getAllUsers({ limit: 1000 }); // Get more for searching
      
      const searchLower = searchTerm.toLowerCase();
      return users
        .filter(user => 
          user.displayName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.department?.toLowerCase().includes(searchLower)
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(department: string): Promise<UserProfile[]> {
    try {
      const { users } = await this.getAllUsers({ department });
      return users;
    } catch (error) {
      console.error('Error getting users by department:', error);
      throw new Error('Failed to get users by department');
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    try {
      const { users } = await this.getAllUsers({ role });
      return users;
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw new Error('Failed to get users by role');
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditRef = collection(db, 'audit_logs');
      await addDoc(auditRef, {
        ...auditData,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error for audit logging failures
    }
  }
}

export const userManagementService = UserManagementService.getInstance();