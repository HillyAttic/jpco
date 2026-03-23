import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ErrorResponses } from '@/lib/api-error-handler';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query: FirebaseFirestore.Query = adminDb.collection('pending_invoices');

    if (status && ['pending', 'archived'].includes(status)) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc');
    const snapshot = await query.get();

    const invoices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
      archivedAt: doc.data().archivedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(invoices, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { verifyAuthToken } = await import('@/lib/server-auth');
    const authResult = await verifyAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return ErrorResponses.unauthorized();
    }

    const userRole = authResult.user.claims.role;
    if (!['admin', 'manager'].includes(userRole)) {
      return ErrorResponses.forbidden('Only managers and admins can create pending invoices');
    }

    const { adminDb } = await import('@/lib/firebase-admin');
    const body = await request.json();
    const { clientName, services, amount, description, remark } = body;

    const now = Timestamp.now();
    const invoiceData = {
      clientName: clientName || null,
      services: services || null,
      amount: amount || null,
      description: description || null,
      remark: remark || null,
      status: 'pending' as const,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('pending_invoices').add(invoiceData);

    return NextResponse.json(
      {
        id: docRef.id,
        ...invoiceData,
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
