/**
 * Relieving Letters Settings API
 * GET: Get settings
 * PUT: Save settings (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, withManagerAuth, AuthenticatedRequest } from '@/lib/server-auth';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { relievingLetterSettingsSchema } from '@/lib/relieving-letter-validation';

const SETTINGS_DOC_ID = 'relieving-letter-settings';

/**
 * GET /api/relieving-letters/settings
 * Get relieving letter settings
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const doc = await adminDb.collection('relieving-letter-settings').doc(SETTINGS_DOC_ID).get();

    if (!doc.exists) {
      // Return default settings if not configured yet
      return NextResponse.json({
        companyName: 'JAIN P & CO.',
        companyAddress: '',
        defaultSignatoryName: '',
        defaultSignatoryDesignation: '',
      }, { status: 200 });
    }

    const settings = { id: doc.id, ...doc.data() };
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/relieving-letters/settings
 * Save relieving letter settings (admin/manager only)
 */
export const PUT = withManagerAuth(async (request: AuthenticatedRequest) => {
  try {
    const { uid } = request.user!;
    const body = await request.json();

    console.log(`[API /api/relieving-letters/settings] PUT - User: ${uid}`);

    // Validate settings
    const validation = relievingLetterSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const settingsData = {
      ...validation.data,
      updatedAt: Timestamp.now(),
    };

    await adminDb.collection('relieving-letter-settings').doc(SETTINGS_DOC_ID).set(settingsData);

    console.log(`[API /api/relieving-letters/settings] PUT - Settings saved successfully`);
    return NextResponse.json({ success: true, ...settingsData }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
});
