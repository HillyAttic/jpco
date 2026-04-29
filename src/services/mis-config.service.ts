import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface MISConfiguration {
  formUrl: string;
  formAssignedUsers: string[];
  formUpdatedAt: Timestamp;
  formUpdatedBy: string;
  sheetUrl: string;
  sheetAssignedUsers: string[];
  sheetUpdatedAt: Timestamp;
  sheetUpdatedBy: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface MISConfigUpdate {
  formUrl?: string;
  formAssignedUsers?: string[];
  sheetUrl?: string;
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

    if (updates.formUrl !== undefined) {
      updateData.formUrl = updates.formUrl;
      updateData.formUpdatedAt = now;
      updateData.formUpdatedBy = updates.updatedBy;
    }

    if (updates.formAssignedUsers !== undefined) {
      updateData.formAssignedUsers = updates.formAssignedUsers;
      updateData.formUpdatedAt = now;
      updateData.formUpdatedBy = updates.updatedBy;
    }

    if (updates.sheetUrl !== undefined) {
      updateData.sheetUrl = updates.sheetUrl;
      updateData.sheetUpdatedAt = now;
      updateData.sheetUpdatedBy = updates.updatedBy;
    }

    if (updates.sheetAssignedUsers !== undefined) {
      updateData.sheetAssignedUsers = updates.sheetAssignedUsers;
      updateData.sheetUpdatedAt = now;
      updateData.sheetUpdatedBy = updates.updatedBy;
    }

    if (!doc.exists) {
      const newConfig: MISConfiguration = {
        formUrl: updates.formUrl || '',
        formAssignedUsers: updates.formAssignedUsers || [],
        formUpdatedAt: now,
        formUpdatedBy: updates.updatedBy,
        sheetUrl: updates.sheetUrl || '',
        sheetAssignedUsers: updates.sheetAssignedUsers || [],
        sheetUpdatedAt: now,
        sheetUpdatedBy: updates.updatedBy,
        createdAt: now,
        createdBy: updates.updatedBy,
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
}

export const misConfigService = new MISConfigService();
