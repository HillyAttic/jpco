import { Timestamp } from 'firebase-admin/firestore';
import type {
  FormTemplate,
  FormTemplateInput,
  FormTemplateFilters,
} from '@/types/form.types';

const COLLECTION = 'form_templates';

export const formTemplateService = {
  /**
   * Get all form templates with optional filters
   */
  async getAll(filters?: FormTemplateFilters): Promise<FormTemplate[]> {
    try {
      console.log('[FormTemplateService] Starting getAll with filters:', filters);
      const { adminDb } = await import('@/lib/firebase-admin');
      console.log('[FormTemplateService] Firebase Admin imported successfully');

      let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

      // Apply filters one at a time to avoid composite index requirements
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters?.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
      }
      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      // Only add orderBy if no other filters are applied (to avoid index requirements)
      const hasFilters = filters?.status || filters?.createdBy || filters?.category;
      if (!hasFilters) {
        query = query.orderBy('updatedAt', 'desc');
      }

      console.log('[FormTemplateService] Executing Firestore query...');
      const snapshot = await query.get();
      console.log('[FormTemplateService] Query successful, found', snapshot.size, 'documents');

      let templates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FormTemplate[];

      // Client-side sorting if we couldn't use orderBy
      if (hasFilters) {
        templates.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis() || 0;
          const bTime = b.updatedAt?.toMillis() || 0;
          return bTime - aTime;
        });
      }

      // Client-side search filter (Firestore doesn't support text search)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        templates = templates.filter(
          (t) =>
            t.title.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        );
      }

      console.log('[FormTemplateService] Returning', templates.length, 'templates');
      return templates;
    } catch (error) {
      console.error('[FormTemplateService] Error in getAll:', error);
      console.error('[FormTemplateService] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Get a single form template by ID
   */
  async getById(id: string): Promise<FormTemplate | null> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const doc = await adminDb.collection(COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    return {
      id: doc.id,
      ...doc.data(),
    } as FormTemplate;
  },

  /**
   * Create a new form template
   */
  async create(
    data: FormTemplateInput,
    creatorUid: string
  ): Promise<FormTemplate> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const now = Timestamp.now();

    const docRef = adminDb.collection(COLLECTION).doc();
    const template: Omit<FormTemplate, 'id'> = {
      ...data,
      createdBy: creatorUid,
      createdAt: now,
      updatedAt: now,
      submissionCount: 0,
    };

    await docRef.set(template);

    return {
      id: docRef.id,
      ...template,
    } as FormTemplate;
  },

  /**
   * Update an existing form template
   */
  async update(
    id: string,
    data: Partial<Omit<FormTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<FormTemplate | null> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const ref = adminDb.collection(COLLECTION).doc(id);
    const existing = await ref.get();

    if (!existing.exists) return null;

    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    await ref.update(updateData);

    const updated = await ref.get();
    return {
      id: updated.id,
      ...updated.data(),
    } as FormTemplate;
  },

  /**
   * Delete a form template
   */
  async delete(id: string): Promise<void> {
    const { adminDb } = await import('@/lib/firebase-admin');
    await adminDb.collection(COLLECTION).doc(id).delete();
  },

  /**
   * Duplicate a form template
   */
  async duplicate(id: string, creatorUid: string): Promise<FormTemplate> {
    const original = await this.getById(id);
    if (!original) throw new Error('Template not found');

    const {
      id: _,
      createdAt,
      updatedAt,
      submissionCount,
      lastSubmissionAt,
      ...templateData
    } = original;

    return this.create(
      {
        ...templateData,
        title: `${original.title} (Copy)`,
        status: 'draft',
      },
      creatorUid
    );
  },

  /**
   * Publish a form template
   */
  async publish(id: string): Promise<FormTemplate | null> {
    return this.update(id, { status: 'published' });
  },

  /**
   * Archive a form template
   */
  async archive(id: string): Promise<FormTemplate | null> {
    return this.update(id, { status: 'archived' });
  },

  /**
   * Increment submission count for a form template
   */
  async incrementSubmissionCount(id: string): Promise<void> {
    const { adminDb } = await import('@/lib/firebase-admin');
    const ref = adminDb.collection(COLLECTION).doc(id);
    const doc = await ref.get();

    if (!doc.exists) return;

    const currentCount = doc.data()?.submissionCount || 0;

    await ref.update({
      submissionCount: currentCount + 1,
      lastSubmissionAt: Timestamp.now(),
    });
  },

  /**
   * Get submission statistics for a form template
   */
  async getStats(id: string): Promise<{
    submissionCount: number;
    lastSubmission?: Date;
  } | null> {
    const template = await this.getById(id);
    if (!template) return null;

    return {
      submissionCount: template.submissionCount,
      lastSubmission: template.lastSubmissionAt
        ? template.lastSubmissionAt.toDate()
        : undefined,
    };
  },

  /**
   * Check if a user has permission to access a form template
   */
  canUserAccess(
    template: FormTemplate,
    user?: { uid: string; role?: string }
  ): boolean {
    const { accessControl } = template;

    // Public forms are accessible to everyone
    if (accessControl.type === 'public') return true;

    // Authenticated forms require a logged-in user
    if (accessControl.type === 'authenticated') return !!user;

    // Restricted forms check roles and user IDs
    if (accessControl.type === 'restricted') {
      if (!user) return false;

      // Check if user's role is allowed
      if (
        accessControl.allowedRoles &&
        user.role &&
        accessControl.allowedRoles.includes(user.role as any)
      ) {
        return true;
      }

      // Check if user's ID is in the allowed list
      if (
        accessControl.allowedUserIds &&
        accessControl.allowedUserIds.includes(user.uid)
      ) {
        return true;
      }

      return false;
    }

    return false;
  },
};
