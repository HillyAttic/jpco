/**
 * Map Access Verification API
 * Validates the Map Access password against the server-side env variable.
 * Independent of the payroll/invoices passwords.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const expectedPassword = process.env.MAP_ACCESS_PASSWORD;

    if (!expectedPassword) {
      console.warn(
        '[MapAccess] MAP_ACCESS_PASSWORD is not set in environment variables. ' +
        'Set it to enable access to the Map.'
      );
      return NextResponse.json(
        { success: false, error: 'Access not configured. Contact administrator.' },
        { status: 403 }
      );
    }

    const isValid = password === expectedPassword;

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MapAccess] Verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
