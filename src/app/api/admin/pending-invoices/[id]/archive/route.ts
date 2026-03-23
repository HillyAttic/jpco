import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { Timestamp } from 'firebase-admin/firestore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (userRole !== 'admin') {
      return ErrorResponses.forbidden('Only managers and admins can archive pending invoices');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { id } = await params;
    const doc = await adminDb.collection('pending_invoices').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Pending invoice');
    }

    if (doc.data()?.status === 'archived') {
      return ErrorResponses.badRequest('Invoice is already archived');
    }

    const now = Timestamp.now();
    await adminDb.collection('pending_invoices').doc(id).update({
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
    });

    const updatedDoc = await adminDb.collection('pending_invoices').doc(id).get();
    const data = updatedDoc.data()!;

    return NextResponse.json({
      id: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      archivedAt: data.archivedAt?.toDate?.()?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
