import { Timestamp } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '@/lib/encryption';
import type {
  SafeCredential,
  CredentialCategory,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  BulkImportResult,
} from '@/types/password-manager.types';

const COLLECTION = 'credential_records';
const ACCESS_COLLECTION = 'credential_access';

function toSafeCredential(doc: FirebaseFirestore.DocumentSnapshot): SafeCredential {
  const data = doc.data()!;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encryptedPassword, ...rest } = data;
  return {
    id: doc.id,
    ...rest,
    hasPassword: true,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt ?? new Date().toISOString()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt ?? new Date().toISOString()),
  } as SafeCredential;
}

export const passwordManagerService = {
  // ── Credential CRUD ──────────────────────────────────────────

  async getAll(filters?: { category?: CredentialCategory }): Promise<SafeCredential[]> {
    const { adminDb } = await import('@/lib/firebase-admin');
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);
    if (filters?.category) {
      query = query.where('category', '==', filters.category).orderBy('clientName', 'asc');
    }
    const snapshot = await query.get();
    return snapshot.docs.map(toSafeCredential);
  },

  async getById(id: string): Promise<SafeCredential | null> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return toSafeCredential(doc);
  },

  async create(payload: CreateCredentialPayload, creatorUid: string): Promise<SafeCredential> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const now = Timestamp.now();
    const { plainPassword, ...fields } = payload;
    const encryptedPassword = encrypt(plainPassword);
    const docRef = adminDb.collection(COLLECTION).doc();
    await docRef.set({
      ...fields,
      encryptedPassword,
      createdBy: creatorUid,
      createdAt: now,
      updatedAt: now,
    });
    const newDoc = await docRef.get();
    return toSafeCredential(newDoc);
  },

  async update(id: string, payload: UpdateCredentialPayload): Promise<SafeCredential | null> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const ref = adminDb.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return null;

    const { plainPassword, ...fields } = payload;
    const updateData: Record<string, unknown> = {
      ...fields,
      updatedAt: Timestamp.now(),
    };

    if (plainPassword) {
      updateData.encryptedPassword = encrypt(plainPassword);
    }

    await ref.update(updateData);
    const updated = await ref.get();
    return toSafeCredential(updated);
  },

  async delete(id: string): Promise<void> {
    const { adminDb } = await import('@/lib/firebase-admin');
    await adminDb.collection(COLLECTION).doc(id).delete();
  },

  async bulkCreate(
    records: CreateCredentialPayload[],
    creatorUid: string
  ): Promise<BulkImportResult> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const now = Timestamp.now();
    const errors: Array<{ index: number; error: string }> = [];
    let created = 0;

    const BATCH_SIZE = 499;
    for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
      const chunk = records.slice(batchStart, batchStart + BATCH_SIZE);
      const batch = adminDb.batch();

      for (let i = 0; i < chunk.length; i++) {
        const globalIndex = batchStart + i;
        try {
          const { plainPassword, ...fields } = chunk[i];
          const encryptedPassword = encrypt(plainPassword);
          const ref = adminDb.collection(COLLECTION).doc();
          batch.set(ref, {
            ...fields,
            encryptedPassword,
            createdBy: creatorUid,
            createdAt: now,
            updatedAt: now,
          });
          created++;
        } catch (err) {
          errors.push({
            index: globalIndex,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      await batch.commit();
    }

    return { created, errors };
  },

  // ── Category-Based Access Control ────────────────────────────

  /** Returns the categories granted to a user (from credential_access/{userId}) */
  async getUserCategoryAccess(userId: string): Promise<string[]> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection(ACCESS_COLLECTION).doc(userId).get();
    if (!doc.exists) return [];
    return (doc.data()!.categories as string[]) ?? [];
  },

  /** Returns all users and their granted categories, enriched with user profile */
  async getAllUsersAccess(): Promise<
    Array<{ uid: string; displayName: string; email: string; categories: string[] }>
  > {
    const { adminDb } = await import('@/lib/firebase-admin');
    // Fetch all user profiles and all access docs in parallel
    const [usersSnap, accessSnap] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection(ACCESS_COLLECTION).get(),
    ]);

    const accessMap = new Map<string, string[]>();
    accessSnap.docs.forEach((doc) => {
      accessMap.set(doc.id, (doc.data().categories as string[]) ?? []);
    });

    return usersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || data.name || data.email || doc.id,
        email: data.email || '',
        categories: accessMap.get(doc.id) ?? [],
      };
    });
  },

  /** Grants/revokes category-level access for a user */
  async updateUserCategoryAccess(
    userId: string,
    categories: string[],
    adminUid: string
  ): Promise<void> {
    const { adminDb } = await import('@/lib/firebase-admin');
    await adminDb.collection(ACCESS_COLLECTION).doc(userId).set({
      categories,
      grantedBy: adminUid,
      updatedAt: Timestamp.now(),
    });
  },

  /** Returns all records in categories granted to a user */
  async getAccessibleByUser(
    userId: string,
    category?: CredentialCategory
  ): Promise<SafeCredential[]> {
    const { adminDb } = await import('@/lib/firebase-admin');

    const grantedCategories = await this.getUserCategoryAccess(userId);
    if (grantedCategories.length === 0) return [];

    if (category) {
      if (!grantedCategories.includes(category)) return [];
      const snapshot = await adminDb
        .collection(COLLECTION)
        .where('category', '==', category)
        .orderBy('clientName', 'asc')
        .get();
      return snapshot.docs.map(toSafeCredential);
    }

    // Fetch all granted categories in parallel
    const snapshots = await Promise.all(
      grantedCategories.map((cat) =>
        adminDb
          .collection(COLLECTION)
          .where('category', '==', cat)
          .orderBy('clientName', 'asc')
          .get()
      )
    );
    const results = snapshots.flatMap((snap) => snap.docs.map(toSafeCredential));
    return results.sort((a, b) => a.clientName.localeCompare(b.clientName));
  },

  /** Decrypts and returns the password — verifies category access first */
  async revealPassword(id: string, requestingUserId: string): Promise<string> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) throw new Error('Record not found');

    const data = doc.data()!;
    const category: string = data.category;

    const grantedCategories = await this.getUserCategoryAccess(requestingUserId);
    if (!grantedCategories.includes(category)) {
      throw new Error('Access denied');
    }

    return decrypt(data.encryptedPassword);
  },

  /** Returns true if the user has been granted access to the given category */
  async hasUserCategoryAccess(userId: string, category: string): Promise<boolean> {
    const categories = await this.getUserCategoryAccess(userId);
    return categories.includes(category);
  },

  /** Updates the allowedUserIds field on a credential record */
  async updateAccess(id: string, allowedUserIds: string[]): Promise<void> {
    const { adminDb } = await import('@/lib/firebase-admin');
    await adminDb.collection(COLLECTION).doc(id).update({
      allowedUserIds,
      updatedAt: Timestamp.now(),
    });
  },
};
