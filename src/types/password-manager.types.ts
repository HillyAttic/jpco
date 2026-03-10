export type CredentialCategory = 'gst' | 'income-tax' | 'mca';

export interface CredentialRecord {
  id: string;
  category: CredentialCategory;
  clientName: string;
  username: string;
  encryptedPassword: string;
  allowedUserIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // GST & MCA
  serialNumber?: string;
  // GST only
  gstNumber?: string;
  // Income Tax only
  dateOfBirth?: string;
  panNumber?: string;
  // MCA only
  membershipDin?: string;
}

export type SafeCredential = Omit<CredentialRecord, 'encryptedPassword'> & {
  hasPassword: boolean;
};

export interface CreateCredentialPayload {
  category: CredentialCategory;
  plainPassword: string;
  clientName: string;
  username: string;
  allowedUserIds?: string[];
  serialNumber?: string;
  gstNumber?: string;
  dateOfBirth?: string;
  panNumber?: string;
  membershipDin?: string;
}

export type UpdateCredentialPayload = Partial<Omit<CreateCredentialPayload, 'category'>>;

export interface AccessUpdatePayload {
  allowedUserIds: string[];
}

export interface BulkImportPayload {
  category: CredentialCategory;
  records: CreateCredentialPayload[];
}

export interface BulkImportResult {
  created: number;
  errors: Array<{ index: number; error: string }>;
}

export interface UserAccessInfo {
  uid: string;
  displayName: string;
  email: string;
  hasAccess: boolean;
}
