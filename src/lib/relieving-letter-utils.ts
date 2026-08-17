import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { LetterNumberSequence } from '@/types/relieving-letter.types';
import { formatLetterNumber } from '@/lib/relieving-letter-format';

// Re-export pure format utilities for convenience
export { parseLetterNumber, isValidLetterNumberFormat, formatLetterNumber } from '@/lib/relieving-letter-format';

/**
 * Generates a unique relieving letter number in format: RL-YYYY-NNN
 *
 * Uses a Firestore document to track the sequence per year.
 * Example: RL-2026-001, RL-2026-002, etc.
 *
 * @param year - The year for the letter number (defaults to current year)
 * @returns The generated letter number string
 */
export async function generateLetterNumber(year?: number): Promise<string> {
  const targetYear = year ?? new Date().getFullYear();

  try {
    // Use a transaction to ensure atomic increment
    const sequenceRef = adminDb.collection('letter-number-sequences').doc(String(targetYear));

    const newNumber = await adminDb.runTransaction(async (transaction) => {
      const sequenceDoc = await transaction.get(sequenceRef);

      let nextNumber: number;

      if (sequenceDoc.exists) {
        // Increment existing sequence
        const sequenceData = sequenceDoc.data() as LetterNumberSequence;
        nextNumber = sequenceData.lastNumber + 1;
      } else {
        // Start new sequence for this year
        nextNumber = 1;
      }

      // Update the sequence document
      const sequenceData: LetterNumberSequence = {
        year: targetYear,
        lastNumber: nextNumber,
        updatedAt: Timestamp.now(),
      };

      transaction.set(sequenceRef, sequenceData);

      return nextNumber;
    });

    return formatLetterNumber(targetYear, newNumber);
  } catch (error) {
    console.error('[RelievingLetterUtils] Error generating letter number:', error);
    throw new Error('Failed to generate letter number');
  }
}

/**
 * Gets the next available letter number preview (without actually consuming it)
 * Useful for displaying what the next number will be in the UI
 *
 * @param year - The year for the letter number (defaults to current year)
 * @returns The preview letter number string
 */
export async function previewNextLetterNumber(year?: number): Promise<string> {
  const targetYear = year ?? new Date().getFullYear();

  try {
    const sequenceDoc = await adminDb.collection('letter-number-sequences').doc(String(targetYear)).get();

    let nextNumber: number;

    if (sequenceDoc.exists) {
      const sequenceData = sequenceDoc.data() as LetterNumberSequence;
      nextNumber = sequenceData.lastNumber + 1;
    } else {
      nextNumber = 1;
    }

    return formatLetterNumber(targetYear, nextNumber);
  } catch (error) {
    console.error('[RelievingLetterUtils] Error previewing letter number:', error);
    // Return a default preview on error
    return `RL-${targetYear}-001`;
  }
}
