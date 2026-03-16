/**
 * Task Attachment Service
 * Client-side Firebase Storage upload/delete for task attachments
 */

import { getStorage, getStorageFunctions } from './firebase-lazy';
import { TaskAttachment } from '@/types/task.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_TASK = 5;

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const ALLOWED_EXTENSIONS = '.png,.jpg,.jpeg,.pdf,.xlsx,.xls,.doc,.docx';

export function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILES_PER_TASK) {
    return `Maximum ${MAX_FILES_PER_TASK} files allowed per task`;
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds 10MB limit`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `File "${file.name}" has unsupported type. Allowed: PNG, JPG, PDF, Excel, Word`;
    }
  }

  return null;
}

export async function uploadTaskAttachments(
  taskId: string,
  files: File[]
): Promise<TaskAttachment[]> {
  const storage = await getStorage();
  const { ref, uploadBytes, getDownloadURL } = await getStorageFunctions();

  const attachments: TaskAttachment[] = [];

  for (const file of files) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `task-attachments/${taskId}/${timestamp}_${safeName}`;
    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, file, {
      contentType: file.type,
    });

    const url = await getDownloadURL(fileRef);

    attachments.push({
      name: file.name,
      url,
      type: file.type,
      size: file.size,
      storagePath,
    });
  }

  return attachments;
}

export async function deleteTaskAttachment(storagePath: string): Promise<void> {
  const storage = await getStorage();
  const { ref, deleteObject } = await getStorageFunctions();
  const fileRef = ref(storage, storagePath);
  await deleteObject(fileRef);
}

export async function uploadCommentAttachments(
  taskId: string,
  files: File[]
): Promise<TaskAttachment[]> {
  const storage = await getStorage();
  const { ref, uploadBytes, getDownloadURL } = await getStorageFunctions();

  const attachments: TaskAttachment[] = [];

  for (const file of files) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `task-comments/${taskId}/${timestamp}_${safeName}`;
    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, file, {
      contentType: file.type,
    });

    const url = await getDownloadURL(fileRef);

    attachments.push({
      name: file.name,
      url,
      type: file.type,
      size: file.size,
      storagePath,
    });
  }

  return attachments;
}

export { ALLOWED_EXTENSIONS, MAX_FILES_PER_TASK };
