import { NextResponse } from 'next/server';

/**
 * GET /api/forms/health
 * Health check endpoint to verify Firebase Admin is working
 */
export async function GET() {
  try {
    console.log('[Health Check] Starting Firebase Admin test...');

    const { adminDb } = await import('@/lib/firebase-admin');
    console.log('[Health Check] Firebase Admin imported successfully');

    // Try a simple Firestore operation
    const testRef = adminDb.collection('form_templates').limit(1);
    console.log('[Health Check] Query created, executing...');

    const snapshot = await testRef.get();
    console.log('[Health Check] Query executed successfully, found', snapshot.size, 'documents');

    return NextResponse.json({
      success: true,
      message: 'Firebase Admin is working',
      documentsFound: snapshot.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
