/**
 * Roster Admin Service
 * Server-side roster operations using Firebase Admin SDK.
 * Use this in API routes instead of rosterService (which uses the client SDK).
 */

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'rosters';

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
        startDate: safeToDate(data.startDate),
        endDate: safeToDate(data.endDate),
        timeStart: safeToDate(data.timeStart),
        timeEnd: safeToDate(data.timeEnd),
        createdAt: safeToDate(data.createdAt) ?? new Date(),
        updatedAt: safeToDate(data.updatedAt) ?? new Date(),
    };
}

function calculateDuration(start?: Date, end?: Date): number | undefined {
    if (!start || !end) return undefined;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export const rosterAdminService = {
    async getRosterEntries(filters: {
        userId?: string;
        month?: number;
        year?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

        if (filters.userId) {
            query = query.where('userId', '==', filters.userId);
        }

        const snapshot = await query.get();
        let entries = snapshot.docs.map((doc) => convertDoc(doc.data(), doc.id));

        // Apply month/year filter client-side
        if (filters.month !== undefined && filters.year !== undefined) {
            entries = entries.filter((entry) => {
                if (entry.taskType === 'multi') {
                    return entry.month === filters.month && entry.year === filters.year;
                } else if (entry.taskType === 'single' && entry.timeStart) {
                    const d = new Date(entry.timeStart);
                    return d.getMonth() + 1 === filters.month && d.getFullYear() === filters.year;
                }
                return false;
            });
        }

        if (filters.startDate) {
            entries = entries.filter((e) => {
                const s = e.startDate || e.timeStart;
                return s && s >= filters.startDate!;
            });
        }

        if (filters.endDate) {
            entries = entries.filter((e) => {
                const end = e.endDate || e.timeEnd;
                return end && end <= filters.endDate!;
            });
        }

        entries.sort((a, b) => {
            const as = a.startDate || a.timeStart;
            const bs = b.startDate || b.timeStart;
            if (!as || !bs) return 0;
            return as.getTime() - bs.getTime();
        });

        return entries;
    },

    async createRosterEntry(data: any) {
        const now = Timestamp.now();
        const entry: any = { ...data, createdAt: now, updatedAt: now };

        if (data.taskType === 'single' && data.timeStart && data.timeEnd) {
            const start = data.timeStart instanceof Date ? data.timeStart : new Date(data.timeStart);
            const end = data.timeEnd instanceof Date ? data.timeEnd : new Date(data.timeEnd);
            entry.durationHours = calculateDuration(start, end);
            entry.taskDate = start.toISOString().split('T')[0];
            entry.timeStart = Timestamp.fromDate(start);
            entry.timeEnd = Timestamp.fromDate(end);
        }

        if (data.taskType === 'multi' && data.startDate && data.endDate) {
            const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
            const end = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
            entry.startDate = Timestamp.fromDate(start);
            entry.endDate = Timestamp.fromDate(end);
        }

        const docRef = await adminDb.collection(COLLECTION).add(entry);

        // Return data we already have — no extra Firestore read needed
        return convertDoc({ ...entry, createdAt: entry.createdAt, updatedAt: entry.updatedAt }, docRef.id);
    },

    async updateRosterEntry(id: string, data: any) {
        const updates: any = { ...data, updatedAt: Timestamp.now() };

        if (data.startDate) {
            updates.startDate = Timestamp.fromDate(
                data.startDate instanceof Date ? data.startDate : new Date(data.startDate)
            );
        }
        if (data.endDate) {
            updates.endDate = Timestamp.fromDate(
                data.endDate instanceof Date ? data.endDate : new Date(data.endDate)
            );
        }
        if (data.timeStart) {
            updates.timeStart = Timestamp.fromDate(
                data.timeStart instanceof Date ? data.timeStart : new Date(data.timeStart)
            );
        }
        if (data.timeEnd) {
            updates.timeEnd = Timestamp.fromDate(
                data.timeEnd instanceof Date ? data.timeEnd : new Date(data.timeEnd)
            );
        }

        // Recalculate duration and taskDate if timeStart/timeEnd are updated for single tasks
        if (data.taskType === 'single' && (data.timeStart || data.timeEnd)) {
            const existingDoc = await adminDb.collection(COLLECTION).doc(id).get();
            const existingData = existingDoc.data();
            const currentStart = updates.timeStart ? safeToDate(updates.timeStart) : safeToDate(existingData?.timeStart);
            const currentEnd = updates.timeEnd ? safeToDate(updates.timeEnd) : safeToDate(existingData?.timeEnd);

            if (currentStart && currentEnd) {
                updates.durationHours = calculateDuration(currentStart, currentEnd);
                updates.taskDate = currentStart.toISOString().split('T')[0];
            }
        }

        await adminDb.collection(COLLECTION).doc(id).update(updates);

        // Return data we already have — no extra Firestore read needed
        const existing = await adminDb.collection(COLLECTION).doc(id).get(); // This read is necessary to get fields not included in 'updates'
        return convertDoc({ ...existing.data()!, ...updates }, id);
    },

    async deleteRosterEntry(id: string) {
        await adminDb.collection(COLLECTION).doc(id).delete();
    },

    async getMonthlyRosterView(month: number, year: number) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        // Use server-side filtering where possible instead of downloading ALL entries
        // Filter multi-tasks by month/year fields on the server
        const multiQuery = adminDb.collection(COLLECTION)
            .where('taskType', '==', 'multi')
            .where('month', '==', month)
            .where('year', '==', year);

        // For single tasks, we need timeStart range filtering
        // Firestore requires a composite index for timestamp range + equality
        // Fall back to fetching single tasks for the broader period
        const singleQuery = adminDb.collection(COLLECTION)
            .where('taskType', '==', 'single');

        const [multiSnapshot, singleSnapshot] = await Promise.all([
            multiQuery.get(),
            singleQuery.get(),
        ]);

        let entries = [
            ...multiSnapshot.docs.map((doc) => convertDoc(doc.data(), doc.id)),
            ...singleSnapshot.docs.map((doc) => convertDoc(doc.data(), doc.id)),
        ];

        // Filter single tasks client-side (only the ones in this month)
        entries = entries.filter((entry) => {
            if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
                return entry.startDate <= endOfMonth && entry.endDate >= startOfMonth;
            } else if (entry.taskType === 'single' && entry.timeStart) {
                const ts = new Date(entry.timeStart);
                return ts >= startOfMonth && ts <= endOfMonth;
            }
            return false;
        });

        // Group by user
        const employeeMap = new Map<string, any>();

        entries.forEach((entry) => {
            if (!employeeMap.has(entry.userId)) {
                employeeMap.set(entry.userId, {
                    userId: entry.userId,
                    userName: entry.userName,
                    activities: [],
                });
            }

            const employee = employeeMap.get(entry.userId)!;

            if (entry.taskType === 'multi' && entry.startDate && entry.endDate) {
                const displayStart = entry.startDate < startOfMonth ? startOfMonth : entry.startDate;
                const displayEnd = entry.endDate > endOfMonth ? endOfMonth : entry.endDate;

                employee.activities.push({
                    id: entry.id,
                    taskType: entry.taskType,
                    activityName: entry.activityName,
                    startDate: entry.startDate,
                    endDate: entry.endDate,
                    startDay: displayStart.getDate(),
                    endDay: displayEnd.getDate(),
                    notes: entry.notes,
                });
            } else if (entry.taskType === 'single' && entry.timeStart && entry.timeEnd) {
                const taskStart = new Date(entry.timeStart);
                const taskEnd = new Date(entry.timeEnd);

                employee.activities.push({
                    id: entry.id,
                    taskType: entry.taskType,
                    clientName: entry.clientName,
                    taskDetail: entry.taskDetail,
                    startDate: entry.timeStart,
                    endDate: entry.timeEnd,
                    startDay: taskStart.getDate(),
                    endDay: taskEnd.getDate(),
                });
            }
        });

        return {
            month,
            year,
            employees: Array.from(employeeMap.values()),
        };
    },
};
