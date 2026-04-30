import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { FileUploadResult, FileAttachment } from '@/types/form.types';

export const formFileUploadService = {
  /**
   * Upload a single file to Firebase Storage
   */
  async uploadFile(
    formId: string,
    submissionId: string,
    fieldId: string,
    file: File
  ): Promise<FileUploadResult> {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `forms/${formId}/${submissionId}/${fieldId}/${timestamp}_${sanitizedFileName}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        fieldId,
      },
    });

    const url = await getDownloadURL(storageRef);

    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    };
  },

  /**
   * Upload multiple files for a single field
   */
  async uploadMultiple(
    formId: string,
    submissionId: string,
    fieldId: string,
    files: File[]
  ): Promise<FileAttachment[]> {
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadFile(formId, submissionId, fieldId, file);
      return {
        fieldId,
        fileName: result.fileName,
        fileUrl: result.url,
        storagePath: result.path,
        fileSize: result.size,
        mimeType: result.mimeType,
      };
    });

    return Promise.all(uploadPromises);
  },

  /**
   * Delete a single file from Firebase Storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error: any) {
      // Ignore errors if file doesn't exist
      if (error.code !== 'storage/object-not-found') {
        console.error(`Failed to delete file ${path}:`, error);
        throw error;
      }
    }
  },

  /**
   * Delete all files associated with a submission
   */
  async deleteSubmissionFiles(
    submissionId: string,
    files: FileAttachment[]
  ): Promise<void> {
    const deletePromises = files.map((file) =>
      this.deleteFile(file.storagePath).catch((err) => {
        console.error(`Failed to delete file ${file.storagePath}:`, err);
      })
    );

    await Promise.all(deletePromises);
  },

  /**
   * Validate file before upload
   */
  validateFile(
    file: File,
    maxSize?: number,
    acceptedTypes?: string
  ): { valid: boolean; error?: string } {
    // Check file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }

    // Check file type
    if (acceptedTypes) {
      const types = acceptedTypes.split(',').map((t) => t.trim().toLowerCase());
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();

      const isValid = types.some((type) => {
        if (type.startsWith('.')) {
          return fileName.endsWith(type);
        }
        if (type.includes('*')) {
          const pattern = type.replace('*', '.*');
          return new RegExp(pattern).test(fileType);
        }
        return fileType === type;
      });

      if (!isValid) {
        return {
          valid: false,
          error: `File type not allowed. Accepted types: ${acceptedTypes}`,
        };
      }
    }

    return { valid: true };
  },

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  },

  /**
   * Check if file is a PDF
   */
  isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  },

  /**
   * Get icon name for file type (for UI display)
   */
  getFileIcon(mimeType: string): string {
    if (this.isImage(mimeType)) return 'image';
    if (this.isPDF(mimeType)) return 'file-text';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'file-spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'file-presentation';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'file-archive';
    return 'file';
  },
};
