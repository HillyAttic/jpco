import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
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
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can access this resource');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { id } = await params;
    const doc = await adminDb.collection('pending_invoices').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Pending invoice');
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      archivedAt: data.archivedAt?.toDate?.()?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
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
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can update pending invoices');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { id } = await params;
    const doc = await adminDb.collection('pending_invoices').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Pending invoice');
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt, archivedAt, ...updateData } = body;

    await adminDb.collection('pending_invoices').doc(id).update({
      ...updateData,
      updatedAt: Timestamp.now(),
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

export async function DELETE(
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
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can delete pending invoices');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const { id } = await params;
    const doc = await adminDb.collection('pending_invoices').doc(id).get();

    if (!doc.exists) {
      return ErrorResponses.notFound('Pending invoice');
    }

    await adminDb.collection('pending_invoices').doc(id).delete();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
