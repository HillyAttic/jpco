import { z } from 'zod';
import { RelievingLetter } from '@/types/relieving-letter.types';

/**
 * Zod schema for validating relieving letter creation
 * Enforces required fields and date relationships
 */
export const relievingLetterSchema = z.object({
  letterNumber: z.string().min(1, 'Letter number is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  employeeName: z.string().min(1, 'Employee name is required').max(200, 'Employee name must be less than 200 characters'),
  employeeDesignation: z.string().min(1, 'Designation is required').max(100, 'Designation must be less than 100 characters'),
  employeeDepartment: z.string().min(1, 'Department is required').max(100, 'Department must be less than 100 characters'),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of joining must be in YYYY-MM-DD format'),
  dateOfLeaving: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of leaving must be in YYYY-MM-DD format'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format'),
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  signatoryName: z.string().min(1, 'Signatory name is required').max(200, 'Signatory name must be less than 200 characters'),
  signatoryDesignation: z.string().min(1, 'Signatory designation is required').max(100, 'Signatory designation must be less than 100 characters'),
  accessGranted: z.boolean(),
  createdBy: z.string().min(1, 'Created by is required'),
}).refine(
  (data) => {
    const joining = new Date(data.dateOfJoining);
    const leaving = new Date(data.dateOfLeaving);
    return joining <= leaving;
  },
  {
    message: 'Date of joining must be on or before date of leaving',
    path: ['dateOfJoining'],
  }
).refine(
  (data) => {
    const issue = new Date(data.issueDate);
    const leaving = new Date(data.dateOfLeaving);
    return issue >= leaving;
  },
  {
    message: 'Issue date must be on or after date of leaving',
    path: ['issueDate'],
  }
);

/**
 * Zod schema for validating relieving letter creation input
 * Omits letterNumber and createdBy (server-generated)
 */
export const relievingLetterCreateSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  employeeName: z.string().min(1, 'Employee name is required').max(200, 'Employee name must be less than 200 characters'),
  employeeDesignation: z.string().min(1, 'Designation is required').max(100, 'Designation must be less than 100 characters'),
  employeeDepartment: z.string().min(1, 'Department is required').max(100, 'Department must be less than 100 characters'),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of joining must be in YYYY-MM-DD format'),
  dateOfLeaving: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of leaving must be in YYYY-MM-DD format'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format'),
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  signatoryName: z.string().min(1, 'Signatory name is required').max(200, 'Signatory name must be less than 200 characters'),
  signatoryDesignation: z.string().min(1, 'Signatory designation is required').max(100, 'Signatory designation must be less than 100 characters'),
  accessGranted: z.boolean(),
}).refine(
  (data) => {
    const joining = new Date(data.dateOfJoining);
    const leaving = new Date(data.dateOfLeaving);
    return joining <= leaving;
  },
  {
    message: 'Date of joining must be on or before date of leaving',
    path: ['dateOfJoining'],
  }
).refine(
  (data) => {
    const issue = new Date(data.issueDate);
    const leaving = new Date(data.dateOfLeaving);
    return issue >= leaving;
  },
  {
    message: 'Issue date must be on or after date of leaving',
    path: ['issueDate'],
  }
);

/**
 * Zod schema for validating relieving letter settings
 */
export const relievingLetterSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  companyAddress: z.string().min(1, 'Company address is required').max(500, 'Company address must be less than 500 characters'),
  defaultSignatoryName: z.string().min(1, 'Default signatory name is required').max(200, 'Signatory name must be less than 200 characters'),
  defaultSignatoryDesignation: z.string().min(1, 'Default signatory designation is required').max(100, 'Signatory designation must be less than 100 characters'),
});

/**
 * Validates a relieving letter input
 * Returns validation result with parsed data or errors
 */
export function validateRelievingLetter(data: unknown) {
  return relievingLetterSchema.safeParse(data);
}

/**
 * Validates relieving letter settings
 * Returns validation result with parsed data or errors
 */
export function validateRelievingLetterSettings(data: unknown) {
  return relievingLetterSettingsSchema.safeParse(data);
}

/**
 * Validates date relationships for a relieving letter
 * Enforces: joining <= leaving and issue >= leaving
 *
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateDateRelationships(
  dateOfJoining: string,
  dateOfLeaving: string,
  issueDate: string
): { isValid: boolean; error?: string } {
  const joining = new Date(dateOfJoining);
  const leaving = new Date(dateOfLeaving);
  const issue = new Date(issueDate);

  // Check for invalid dates
  if (isNaN(joining.getTime())) {
    return { isValid: false, error: 'Invalid date of joining' };
  }
  if (isNaN(leaving.getTime())) {
    return { isValid: false, error: 'Invalid date of leaving' };
  }
  if (isNaN(issue.getTime())) {
    return { isValid: false, error: 'Invalid issue date' };
  }

  // Check relationships
  if (joining > leaving) {
    return {
      isValid: false,
      error: 'Date of joining must be on or before date of leaving',
    };
  }

  if (issue < leaving) {
    return {
      isValid: false,
      error: 'Issue date must be on or after date of leaving',
    };
  }

  return { isValid: true };
}

/**
 * Validates required fields for a relieving letter
 *
 * @returns Object with isValid boolean and array of missing fields
 */
export function validateRequiredFields(
  data: Partial<RelievingLetter>
): { isValid: boolean; missingFields: string[] } {
  const requiredFields: Array<{ key: keyof RelievingLetter; label: string }> = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'employeeName', label: 'Employee Name' },
    { key: 'employeeDesignation', label: 'Designation' },
    { key: 'employeeDepartment', label: 'Department' },
    { key: 'dateOfJoining', label: 'Date of Joining' },
    { key: 'dateOfLeaving', label: 'Date of Leaving' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'companyName', label: 'Company Name' },
    { key: 'signatoryName', label: 'Signatory Name' },
    { key: 'signatoryDesignation', label: 'Signatory Designation' },
  ];

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field.key];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field.label);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
