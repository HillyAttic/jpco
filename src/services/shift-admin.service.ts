/**
 * Shift Admin Service
 * Server-side shift operations using Firebase Admin SDK.
 * Use this in API routes instead of shiftService (which uses the client SDK).
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const COLLECTION = 'shifts';

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

export const shiftAdminService = {
    async getShifts() {
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where('isActive', '==', true)
            .get();
        // ponytail: sort in memory (few docs) — swap for orderBy + composite index if shifts grow.
        return snapshot.docs
            .map((doc) => convertDoc(doc.data(), doc.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    },

    async getShift(id: string) {
        const doc = await adminDb.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return convertDoc(doc.data()!, doc.id);
    },

    async createShift(data: any) {
        // Check if shift name already exists
        const existing = await adminDb
            .collection(COLLECTION)
            .where('name', '==', data.name)
            .get();

        if (!existing.empty) {
            throw new Error('Shift name already exists');
        }

        const now = Timestamp.now();
        const shift = {
            ...data,
            isActive: true,
            assignedEmployees: [],
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await adminDb.collection(COLLECTION).add(shift);
        const created = await docRef.get();
        return convertDoc(created.data()!, docRef.id);
    },

    async updateShift(id: string, data: any) {
        await adminDb.collection(COLLECTION).doc(id).update({
            ...data,
            updatedAt: Timestamp.now(),
        });
        const updated = await adminDb.collection(COLLECTION).doc(id).get();
        return convertDoc(updated.data()!, id);
    },

    // ponytail: atomic arrayUnion/arrayRemove make assigns idempotent and race-free —
    // swap to a batch write only if a single shift is ever assigned thousands of employees.
    async assignEmployeesToShift(shiftId: string, employeeIds: string[]) {
        if (!employeeIds.length) return;
        await adminDb.collection(COLLECTION).doc(shiftId).update({
            assignedEmployees: FieldValue.arrayUnion(...employeeIds),
            updatedAt: Timestamp.now(),
        });
    },

    async unassignEmployeesFromShift(shiftId: string, employeeIds: string[]) {
        if (!employeeIds.length) return;
        await adminDb.collection(COLLECTION).doc(shiftId).update({
            assignedEmployees: FieldValue.arrayRemove(...employeeIds),
            updatedAt: Timestamp.now(),
        });
    },

    async deleteShift(id: string) {
        await adminDb.collection(COLLECTION).doc(id).update({
            isActive: false,
            updatedAt: Timestamp.now(),
        });
    },
};
