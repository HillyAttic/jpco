import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface FormToUserMapping {
  formId: string;
  formTitle: string; // Denormalized for display
  assignedUserIds: string[];
  requiredForClockout: boolean; // Per-form clock-out requirement
}

export interface SheetUserFormMapping {
  userId: string;
  formIds: string[]; // Which forms this user can view in MIS Tracker
}

export interface MISConfiguration {
  // NEW: Multi-form assignments
  formToUserMappings: FormToUserMapping[];

  // NEW: Per-user form access for submissions viewing
  sheetUserFormMappings?: SheetUserFormMapping[];

  // LEGACY: Keep for backward compatibility (will auto-migrate)
  dailyFormTemplateId?: string; // ID of the form template to use for daily MIS
  formAssignedUsers: string[];

  // UNCHANGED
  formUpdatedAt: Timestamp;
  formUpdatedBy: string;
  sheetAssignedUsers: string[]; // Users who can view submissions
  sheetUpdatedAt: Timestamp;
  sheetUpdatedBy: string;
  createdAt: Timestamp;
  createdBy: string;
  formRequiredForClockout?: boolean; // LEGACY - now per-form in mappings
}

export interface MISConfigUpdate {
  // NEW: Multi-form mappings
  formToUserMappings?: FormToUserMapping[];

  // NEW: Per-user sheet form access
  sheetUserFormMappings?: SheetUserFormMapping[];

  // LEGACY: Keep for backward compatibility
  dailyFormTemplateId?: string;
  formAssignedUsers?: string[];
  formRequiredForClockout?: boolean;

  // UNCHANGED
  sheetAssignedUsers?: string[];
  updatedBy: string;
}

const MIS_CONFIG_COLLECTION = 'mis_configurations';
const MIS_CONFIG_DOC_ID = 'current';

export class MISConfigService {
  async getMISConfig(): Promise<MISConfiguration | null> {
    const docRef = adminDb.collection(MIS_CONFIG_COLLECTION).doc(MIS_CONFIG_DOC_ID);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as MISConfiguration;
  }

  async updateMISConfig(updates: MISConfigUpdate): Promise<MISConfiguration> {
    const docRef = adminDb.collection(MIS_CONFIG_COLLECTION).doc(MIS_CONFIG_DOC_ID);
    const doc = await docRef.get();

    const now = Timestamp.now();
    const updateData: any = {};

    // MIGRATION: Convert legacy format to new format if needed
    if (doc.exists) {
      const existingData = doc.data() as MISConfiguration;

      // If formToUserMappings doesn't exist but legacy fields do, migrate
      if (!existingData.formToUserMappings && existingData.dailyFormTemplateId) {
        console.log('[MIS Config] Migrating legacy format to new format');

        try {
          const { formTemplateService } = await import('./form-template.service');
          const template = await formTemplateService.getById(existingData.dailyFormTemplateId);

          existingData.formToUserMappings = [{
            formId: existingData.dailyFormTemplateId,
            formTitle: template?.title || 'Daily Form',
            assignedUserIds: existingData.formAssignedUsers || [],
            requiredForClockout: existingData.formRequiredForClockout ?? false
          }];

          // Update the document with migrated data
          await docRef.update({ formToUserMappings: existingData.formToUserMappings });
          console.log('[MIS Config] Migration completed successfully');
        } catch (error) {
          console.error('[MIS Config] Migration error:', error);
          // Continue with update even if migration fails
        }
      }
    }

    // Handle new formToUserMappings
    if (updates.formToUserMappings !== undefined) {
      updateData.formToUserMappings = updates.formToUserMappings;
      updateData.formUpdatedAt = now;
      updateData.formUpdatedBy = updates.updatedBy;
    }

    // Handle new sheetUserFormMappings
    if (updates.sheetUserFormMappings !== undefined) {
      updateData.sheetUserFormMappings = updates.sheetUserFormMappings;
      updateData.sheetUpdatedAt = now;
      updateData.sheetUpdatedBy = updates.updatedBy;
      // Auto-sync sheetAssignedUsers from mappings
      updateData.sheetAssignedUsers = updates.sheetUserFormMappings.map(m => m.userId);
    }

    // Handle legacy fields (for backward compatibility)
    if (updates.dailyFormTemplateId !== undefined) {
      updateData.dailyFormTemplateId = updates.dailyFormTemplateId;
      updateData.formUpdatedAt = now;
      updateData.formUpdatedBy = updates.updatedBy;
    }

    if (updates.formAssignedUsers !== undefined) {
      updateData.formAssignedUsers = updates.formAssignedUsers;
      updateData.formUpdatedAt = now;
      updateData.formUpdatedBy = updates.updatedBy;
    }

    if (updates.sheetAssignedUsers !== undefined) {
      updateData.sheetAssignedUsers = updates.sheetAssignedUsers;
      updateData.sheetUpdatedAt = now;
      updateData.sheetUpdatedBy = updates.updatedBy;
    }

    if (updates.formRequiredForClockout !== undefined) {
      updateData.formRequiredForClockout = updates.formRequiredForClockout;
    }

    if (!doc.exists) {
      const newConfig: MISConfiguration = {
        formToUserMappings: updates.formToUserMappings || [],
        sheetUserFormMappings: updates.sheetUserFormMappings || [],
        dailyFormTemplateId: updates.dailyFormTemplateId || '',
        formAssignedUsers: updates.formAssignedUsers || [],
        formUpdatedAt: now,
        formUpdatedBy: updates.updatedBy,
        sheetAssignedUsers: updates.sheetUserFormMappings
          ? updates.sheetUserFormMappings.map(m => m.userId)
          : (updates.sheetAssignedUsers || []),
        sheetUpdatedAt: now,
        sheetUpdatedBy: updates.updatedBy,
        createdAt: now,
        createdBy: updates.updatedBy,
        formRequiredForClockout: updates.formRequiredForClockout ?? false,
      };
      await docRef.set(newConfig);
      return newConfig;
    }

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    return updatedDoc.data() as MISConfiguration;
  }

  async isUserAssignedToForm(uid: string): Promise<boolean> {
    const config = await this.getMISConfig();
    if (!config) return false;
    return config.formAssignedUsers.includes(uid);
  }

  async isUserAssignedToSheet(uid: string): Promise<boolean> {
    const config = await this.getMISConfig();
    if (!config) return false;
    return config.sheetAssignedUsers.includes(uid);
  }

  /**
   * Get all forms assigned to a specific user
   */
  async getUserAssignedForms(userId: string): Promise<FormToUserMapping[]> {
    const config = await this.getMISConfig();
    if (!config || !config.formToUserMappings) return [];

    return config.formToUserMappings.filter(mapping =>
      mapping.assignedUserIds.includes(userId)
    );
  }

  /**
   * Get all forms assigned to a user that require clock-out validation
   */
  async getRequiredFormsForUser(userId: string): Promise<FormToUserMapping[]> {
    const assignedForms = await this.getUserAssignedForms(userId);
    return assignedForms.filter(form => form.requiredForClockout);
  }

  /**
   * Check if a user is assigned to any form
   */
  async isUserAssignedToAnyForm(userId: string): Promise<boolean> {
    const assignedForms = await this.getUserAssignedForms(userId);
    return assignedForms.length > 0;
  }

  /**
   * Get form IDs allowed for a user to view in MIS Tracker.
   * Returns null if the user has legacy blanket access (all forms).
   * Returns string[] if per-user mappings exist.
   * Returns undefined if the user has no sheet access.
   */
  async getUserAllowedFormIds(userId: string): Promise<string[] | null | undefined> {
    const config = await this.getMISConfig();
    if (!config) return undefined;

    const hasLegacyAccess = config.sheetAssignedUsers.includes(userId);
    const mappings = config.sheetUserFormMappings || [];
    const userMapping = mappings.find(m => m.userId === userId);

    if (userMapping) {
      // Per-user mapping exists — return their allowed forms
      return userMapping.formIds;
    }

    if (hasLegacyAccess) {
      // Legacy blanket access — null means "all forms"
      return null;
    }

    // No access
    return undefined;
  }
}

export const misConfigService = new MISConfigService();
