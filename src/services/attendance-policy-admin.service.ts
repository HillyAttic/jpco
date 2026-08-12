/**
 * Attendance Policy Admin Service
 * Server-side attendance policy operations using Firebase Admin SDK.
 * Use this in API routes for managing attendance policies.
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'attendance-policies';

// Default policy values (matching current hardcoded values)
const DEFAULT_POLICY = {
  name: 'Default Policy',
  graceMinutes: 30,
  maxMonthlyDelayRequests: 2,
  maxBreakMinutes: 60,
  autoClockOutTime: '18:30',
  geolocationRequired: true,
  geolocationRadius: 100,
  overtimeMultiplier: 1.5,
  minDailyHours: 8,
  maxDailyHours: 12,
};

function safeToDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function convertDoc(data: any, id: string) {
  return {
    id,
    ...data,
    createdAt: safeToDate(data.createdAt) ?? new Date(),
    updatedAt: safeToDate(data.updatedAt) ?? new Date(),
  };
}

export const attendancePolicyAdminService = {
  /**
   * Get all active attendance policies
   */
  async getPolicies() {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .orderBy('name', 'asc')
      .get();
    return snapshot.docs.map((doc) => convertDoc(doc.data(), doc.id));
  },

  /**
   * Get a single attendance policy by ID
   */
  async getPolicy(id: string) {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return convertDoc(doc.data()!, doc.id);
  },

  /**
   * Get the default/active attendance policy.
   * If no policy exists, auto-creates one with default values.
   */
  async getDefaultPolicy() {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return convertDoc(snapshot.docs[0].data(), snapshot.docs[0].id);
    }

    // Auto-create default policy if none exists
    const now = Timestamp.now();
    const defaultPolicy = {
      ...DEFAULT_POLICY,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(COLLECTION).add(defaultPolicy);
    const created = await docRef.get();
    return convertDoc(created.data()!, docRef.id);
  },

  /**
   * Create a new attendance policy
   */
  async createPolicy(data: {
    name: string;
    graceMinutes: number;
    maxMonthlyDelayRequests: number;
    maxBreakMinutes: number;
    autoClockOutTime: string;
    geolocationRequired: boolean;
    geolocationRadius: number;
    overtimeMultiplier: number;
    minDailyHours: number;
    maxDailyHours: number;
  }) {
    // Check if policy name already exists
    const existing = await adminDb
      .collection(COLLECTION)
      .where('name', '==', data.name)
      .get();

    if (!existing.empty) {
      throw new Error('Policy name already exists');
    }

    const now = Timestamp.now();
    const policy = {
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection(COLLECTION).add(policy);
    const created = await docRef.get();
    return convertDoc(created.data()!, docRef.id);
  },

  /**
   * Update an existing attendance policy
   */
  async updatePolicy(id: string, data: Partial<{
    name: string;
    graceMinutes: number;
    maxMonthlyDelayRequests: number;
    maxBreakMinutes: number;
    autoClockOutTime: string;
    geolocationRequired: boolean;
    geolocationRadius: number;
    overtimeMultiplier: number;
    minDailyHours: number;
    maxDailyHours: number;
    isActive: boolean;
  }>) {
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Policy not found');

    await docRef.update({
      ...data,
      updatedAt: Timestamp.now(),
    });

    const updated = await docRef.get();
    return convertDoc(updated.data()!, id);
  },

  /**
   * Soft-delete an attendance policy (set isActive to false)
   */
  async deletePolicy(id: string) {
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Policy not found');

    await docRef.update({
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Get shift assigned to an employee for a given date
   */
  async getShiftForEmployee(employeeId: string, date: Date = new Date()) {
    const dayOfWeek = date.getDay(); // 0-6, Sunday-Saturday

    const snapshot = await adminDb
      .collection('shifts')
      .where('isActive', '==', true)
      .get();

    for (const doc of snapshot.docs) {
      const shift = doc.data();
      const assignedEmployees: string[] = shift.assignedEmployees || [];
      const daysOfWeek: number[] = shift.daysOfWeek || [];

      if (assignedEmployees.includes(employeeId) && daysOfWeek.includes(dayOfWeek)) {
        return {
          id: doc.id,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          daysOfWeek: shift.daysOfWeek,
          breakDuration: shift.breakDuration,
          overtimeThreshold: shift.overtimeThreshold,
          color: shift.color,
          isActive: shift.isActive,
          assignedEmployees: shift.assignedEmployees,
        };
      }
    }

    return null; // No shift assigned
  },
};
