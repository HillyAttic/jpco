/**
 * Relieving Letter Types
 * Type definitions for the relieving letter module
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Relieving Letter document structure
 * Stores details about an employee's relieving letter
 */
export interface RelievingLetter {
  id?: string;
  letterNumber: string;          // Auto-generated, e.g. "RL-2026-001"
  employeeId: string;            // Firebase Auth UID
  employeeName: string;          // Full name at time of leaving
  employeeDesignation: string;   // Last held position
  employeeDepartment: string;    // Department at time of leaving
  dateOfJoining: string;         // ISO date string (YYYY-MM-DD)
  dateOfLeaving: string;         // ISO date string (YYYY-MM-DD)
  issueDate: string;             // ISO date string (YYYY-MM-DD)
  companyName: string;           // From company settings
  signatoryName: string;         // Person signing the letter
  signatoryDesignation: string;  // Signatory position/title
  accessGranted: boolean;        // Employee can view when true
  createdAt?: Timestamp;
  createdBy: string;             // Admin UID who created the letter
  updatedAt?: Timestamp;
  updatedBy?: string;            // Admin UID who last updated
}

/**
 * Relieving Letter settings (singleton document)
 * Stores default configuration for letter generation
 */
export interface RelievingLetterSettings {
  id?: string;
  companyName: string;
  companyAddress: string;
  defaultSignatoryName: string;
  defaultSignatoryDesignation: string;
  updatedAt?: Timestamp;
}

/**
 * Input type for creating a new relieving letter
 * letterNumber is omitted because it's auto-generated server-side
 */
export type CreateRelievingLetterInput = Omit<RelievingLetter, 'id' | 'letterNumber' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

/**
 * Input type for updating an existing relieving letter
 */
export type UpdateRelievingLetterInput = Partial<Omit<RelievingLetter, 'id' | 'letterNumber' | 'createdAt' | 'createdBy'>>;

/**
 * Letter number sequence document structure
 * Used for auto-generating sequential letter numbers
 */
export interface LetterNumberSequence {
  id?: string;
  year: number;
  lastNumber: number;
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number };
}
