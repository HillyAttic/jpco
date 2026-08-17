/**
 * Relieving Letter Service
 * Client-side service using authenticatedFetch for relieving letter operations
 */

import { authenticatedFetch } from '@/lib/api-client';
import { RelievingLetter, RelievingLetterSettings, CreateRelievingLetterInput, UpdateRelievingLetterInput } from '@/types/relieving-letter.types';

export const relievingLetterService = {
  /**
   * Get relieving letter settings
   */
  async getSettings(): Promise<RelievingLetterSettings | null> {
    const response = await authenticatedFetch('/api/relieving-letters/settings');
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Save relieving letter settings
   */
  async saveSettings(settings: Omit<RelievingLetterSettings, 'id' | 'updatedAt'>): Promise<boolean> {
    const response = await authenticatedFetch('/api/relieving-letters/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return response.ok;
  },

  /**
   * Get relieving letters with optional filters
   */
  async getLetters(params: {
    employeeId?: string;
    includeAll?: boolean;
  } = {}): Promise<RelievingLetter[]> {
    const searchParams = new URLSearchParams();
    if (params.employeeId) searchParams.set('employeeId', params.employeeId);
    if (params.includeAll) searchParams.set('includeAll', 'true');

    const response = await authenticatedFetch(`/api/relieving-letters?${searchParams.toString()}`);
    if (!response.ok) return [];
    return response.json();
  },

  /**
   * Get a single relieving letter by ID
   */
  async getLetterById(id: string): Promise<RelievingLetter | null> {
    const response = await authenticatedFetch(`/api/relieving-letters/${id}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Create a new relieving letter
   */
  async createLetter(input: CreateRelievingLetterInput): Promise<RelievingLetter | null> {
    const response = await authenticatedFetch('/api/relieving-letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (error?.details) {
        const messages = error.details.map((d: any) => d.message).join('; ');
        throw new Error(messages);
      }
      return null;
    }
    return response.json();
  },

  /**
   * Update an existing relieving letter
   */
  async updateLetter(id: string, input: UpdateRelievingLetterInput): Promise<boolean> {
    const response = await authenticatedFetch(`/api/relieving-letters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.ok;
  },

  /**
   * Delete a relieving letter (hard delete)
   */
  async deleteLetter(id: string): Promise<boolean> {
    const response = await authenticatedFetch(`/api/relieving-letters/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  },

  /**
   * Toggle access granted for a letter
   * Returns whether notification was sent to employee
   */
  async toggleAccess(id: string, accessGranted: boolean): Promise<{ success: boolean; notificationSent: boolean } | null> {
    const response = await authenticatedFetch(`/api/relieving-letters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessGranted }),
    });
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Preview next available letter number (without consuming it)
   */
  async previewNextLetterNumber(): Promise<string> {
    const response = await authenticatedFetch('/api/relieving-letters/preview');
    if (!response.ok) return '';
    const data = await response.json();
    return data.letterNumber || '';
  },
};
