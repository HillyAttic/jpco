/**
 * Employee Admin Service
 * Server-side service using Firebase Admin SDK for employee operations
 * This bypasses Firestore security rules and should only be used in API routes
 */

import { adminDb } from '@/lib/firebase-admin';
import { UserRole } from '@/types/auth.types';

export interface Employee {
  id?: string; // Firebase Auth UID
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Manager' | 'Admin' | 'Employee';
  status: 'active' | 'on-leave';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Employee Admin Service - Server-side only
 * Uses Firebase Admin SDK to bypass security rules
 */
export const employeeAdminService = {
  /**
   * Get all employees with optional filters
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Employee[]> {
    try {
      console.log('[EmployeeAdminService] Fetching employees from users collection');

      let query = adminDb.collection('users');

      // Add status filter if provided
      if (filters?.status) {
        query = query.where('status', '==', filters.status) as any;
      }

      const snapshot = await query.get();
      console.log(`[EmployeeAdminService] Found ${snapshot.size} users`);

      let employees: Employee[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        employees.push({
          id: doc.id,
          employeeId: data.employeeId || data.uid || doc.id,
          name: data.displayName || data.name || '',
          email: data.email || '',
          phone: data.phoneNumber || data.phone || '',
          role: this.mapUserRoleToEmployeeRole(data.role),
          status: data.isActive === false ? 'on-leave' : 'active',
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      });

      // Apply search filter (client-side)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        employees = employees.filter(emp =>
          emp.name.toLowerCase().includes(searchLower) ||
          emp.email.toLowerCase().includes(searchLower) ||
          emp.employeeId.toLowerCase().includes(searchLower) ||
          emp.role.toLowerCase().includes(searchLower)
        );
      }

      // Apply limit
      if (filters?.limit) {
        employees = employees.slice(0, filters.limit);
      }

      console.log(`[EmployeeAdminService] Returning ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error('[EmployeeAdminService] Error in getAll:', error);
      throw error;
    }
  },

  /**
   * Map user role to employee role
   */
  mapUserRoleToEmployeeRole(userRole?: string): 'Manager' | 'Admin' | 'Employee' {
    if (userRole === 'admin') return 'Admin';
    if (userRole === 'manager') return 'Manager';
    return 'Employee';
  },

  /**
   * Map employee role to user role
   */
  mapEmployeeRoleToUserRole(employeeRole: 'Manager' | 'Admin' | 'Employee'): UserRole {
    if (employeeRole === 'Admin') return 'admin';
    if (employeeRole === 'Manager') return 'manager';
    return 'employee';
  },

  /**
   * Get an employee by ID (Firebase Auth UID)
   */
  async getById(id: string): Promise<Employee | null> {
    try {
      const userDoc = await adminDb.collection('users').doc(id).get();

      if (!userDoc.exists) {
        return null;
      }

      const data = userDoc.data()!;
      return {
        id: userDoc.id,
        employeeId: data.employeeId || data.uid || userDoc.id,
        name: data.displayName || data.name || '',
        email: data.email || '',
        phone: data.phoneNumber || data.phone || '',
        role: this.mapUserRoleToEmployeeRole(data.role),
        status: data.isActive === false ? 'on-leave' : 'active',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('[EmployeeAdminService] Error getting employee by ID:', error);
      return null;
    }
  },

  /**
   * Get an employee by employee ID
   */
  async getByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const snapshot = await adminDb.collection('users')
        .where('employeeId', '==', employeeId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        employeeId: data.employeeId || data.uid || doc.id,
        name: data.displayName || data.name || '',
        email: data.email || '',
        phone: data.phoneNumber || data.phone || '',
        role: this.mapUserRoleToEmployeeRole(data.role),
        status: data.isActive === false ? 'on-leave' : 'active',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } catch (error) {
      console.error('[EmployeeAdminService] Error getting employee by employeeId:', error);
      return null;
    }
  },

  /**
   * Update an employee
   */
  async update(
    id: string,
    data: Partial<Omit<Employee, 'id'>>
  ): Promise<Employee> {
    console.log('[EmployeeAdminService] Updating employee:', id);

    try {
      const userRef = adminDb.collection('users').doc(id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new Error('Employee not found');
      }

      // Prepare update payload
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (data.name) {
        updatePayload.displayName = data.name;
      }
      if (data.email) {
        updatePayload.email = data.email;
      }
      if (data.phone) {
        updatePayload.phoneNumber = data.phone;
      }
      if (data.role) {
        updatePayload.role = this.mapEmployeeRoleToUserRole(data.role);
      }
      if (data.status) {
        updatePayload.isActive = data.status === 'active';
        updatePayload.status = data.status;
      }
      if (data.employeeId) {
        updatePayload.employeeId = data.employeeId;
      }

      // Update user document
      await userRef.update(updatePayload);

      console.log('[EmployeeAdminService] Employee updated successfully');

      // Return updated employee
      return await this.getById(id) as Employee;
    } catch (error) {
      console.error('[EmployeeAdminService] Error updating employee:', error);
      throw error;
    }
  },

  /**
   * Create a new employee using Firebase Admin Auth + Firestore
   */
  async create(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
    password: string
  ): Promise<Employee> {
    const { adminAuth } = await import('@/lib/firebase-admin');
    const { Timestamp } = await import('firebase-admin/firestore');

    // Check if employee ID already exists
    const existing = await this.getByEmployeeId(data.employeeId);
    if (existing) {
      throw new Error('Employee ID already exists');
    }

    // Check if email already exists in Firestore
    const emailSnapshot = await adminDb.collection('users').where('email', '==', data.email).limit(1).get();
    if (!emailSnapshot.empty) {
      throw new Error('Email already exists');
    }

    // Create user in Firebase Auth
    const userRole = this.mapEmployeeRoleToUserRole(data.role);
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password,
      displayName: data.name,
      phoneNumber: data.phone || undefined,
    });

    const now = Timestamp.now();

    // Create user document in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: data.email,
      displayName: data.name,
      phoneNumber: data.phone || '',
      role: userRole,
      employeeId: data.employeeId,
      status: data.status,
      isActive: data.status === 'active',
      createdAt: now,
      updatedAt: now,
    });

    // Set custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: userRole });

    return {
      id: userRecord.uid,
      employeeId: data.employeeId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      status: data.status,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  },


  async delete(id: string): Promise<void> {
    try {
      await adminDb.collection('users').doc(id).delete();
      console.log('[EmployeeAdminService] Employee deleted:', id);
    } catch (error) {
      console.error('[EmployeeAdminService] Error deleting employee:', error);
      throw error;
    }
  },

  /**
   * Deactivate an employee (set to on-leave)
   */
  async deactivate(id: string): Promise<Employee> {
    await adminDb.collection('users').doc(id).update({
      isActive: false,
      status: 'on-leave',
      updatedAt: new Date(),
    });
    return await this.getById(id) as Employee;
  },

  /**
   * Get employee statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    onLeave: number;
  }> {
    const allEmployees = await this.getAll();

    return {
      total: allEmployees.length,
      active: allEmployees.filter((e) => e.status === 'active').length,
      onLeave: allEmployees.filter((e) => e.status === 'on-leave').length,
    };
  },
};
